import { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'

const slides = [
  { emoji: '🌿', title: 'Bienvenido a CannaTrack', desc: 'Gestiona tu cultivo con calendarios automáticos' },
  { emoji: '📅', title: 'Calendarios inteligentes', desc: 'Nutrición, riego y observaciones programadas' },
  { emoji: '📸', title: 'Registro fotográfico', desc: 'Documenta el progreso de tus plantas' },
  { emoji: '🔍', title: 'Diagnóstico visual', desc: 'Detecta problemas antes de que sea tarde' },
]

export default function OnboardingScreen() {
  const [current, setCurrent] = useState(0)

  const handleNext = () => {
    if (current < slides.length - 1) setCurrent(current + 1)
    else router.replace('/(tabs)')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410' }}>
      <ScrollView contentContainerStyle={{ flex: 1, padding: 20, justifyContent: 'space-between' }} scrollEnabled={false}>
        <View style={{ alignItems: 'center', marginTop: 60 }}>
          <Text style={{ fontSize: 80, marginBottom: 20 }}>{slides[current].emoji}</Text>
          <Text style={{ color: '#E4F2E7', fontSize: 28, fontWeight: '900', marginBottom: 12, textAlign: 'center' }}>
            {slides[current].title}
          </Text>
          <Text style={{ color: '#728C74', fontSize: 16, textAlign: 'center', lineHeight: 24 }}>
            {slides[current].desc}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 40 }}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === current ? 24 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: i === current ? '#52CC64' : '#1C2E1E',
              }}
            />
          ))}
        </View>

        <View style={{ gap: 12 }}>
          <TouchableOpacity
            onPress={handleNext}
            style={{
              backgroundColor: '#52CC64',
              borderRadius: 18,
              paddingVertical: 16,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>
              {current === slides.length - 1 ? 'Comenzar →' : 'Siguiente →'}
            </Text>
          </TouchableOpacity>
          {current > 0 && (
            <TouchableOpacity
              onPress={() => setCurrent(current - 1)}
              style={{
                backgroundColor: '#131D14',
                borderRadius: 18,
                borderWidth: 1,
                borderColor: '#1C2E1E',
                paddingVertical: 16,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#728C74', fontWeight: '700', fontSize: 16 }}>← Atrás</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
