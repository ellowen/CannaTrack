import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { usePlants } from '@/hooks/usePlants'

export default function PlantsScreen() {
  const { plants } = usePlants()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410' }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Header */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>
            MI CULTIVACION
          </Text>
          <Text style={{ color: '#E4F2E7', fontSize: 26, fontWeight: '900' }}>
            Mis Plantas
          </Text>
        </View>

        {/* Plants List */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            PLANTAS · {plants.length}
          </Text>
          <TouchableOpacity onPress={() => router.push('/plants/new')}>
            <Text style={{ color: '#52CC64', fontSize: 13, fontWeight: '700' }}>+ Nueva</Text>
          </TouchableOpacity>
        </View>

        {plants.length === 0 ? (
          <TouchableOpacity
            onPress={() => router.push('/onboarding')}
            style={{ backgroundColor: '#131D14', borderRadius: 20, borderWidth: 2, borderColor: '#52CC64', borderStyle: 'dashed', padding: 40, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🌱</Text>
            <Text style={{ color: '#E4F2E7', fontWeight: '900', fontSize: 17 }}>Sin plantas aun</Text>
            <Text style={{ color: '#728C74', fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 18 }}>
              Comienza tu primer cultivo{'\n'}y sigue el calendario nutritivo
            </Text>
            <View style={{ marginTop: 16, backgroundColor: '#52CC64', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 }}>
              <Text style={{ color: '#0C1410', fontWeight: '800', fontSize: 14 }}>Nueva Planta →</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={{ gap: 12 }}>
            {plants.map(plant => (
              <TouchableOpacity
                key={plant.id}
                onPress={() => router.push(`/plants/${plant.id}`)}
                style={{ backgroundColor: '#131D14', borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E', overflow: 'hidden' }}
                activeOpacity={0.85}
              >
                <View style={{ backgroundColor: '#1A3D1E', padding: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <View style={{ backgroundColor: '#0D2010', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ color: '#52CC64', fontSize: 10, fontWeight: '800' }}>
                        {plant.geneticType === 'autoflower' ? 'AUTO' : plant.geneticType === 'feminized' ? 'FEM' : 'REG'}
                      </Text>
                    </View>
                    <Text style={{ color: '#6DC278', fontSize: 11, fontWeight: '600' }}>
                      {plant.floraStartDate ? 'FLORA' : 'VEGE'}
                    </Text>
                  </View>
                  <Text style={{ color: '#E4F2E7', fontSize: 20, fontWeight: '900' }}>{plant.name}</Text>
                  <Text style={{ color: '#6DC278', fontSize: 13, marginTop: 2 }}>{plant.genetics}</Text>
                </View>
                <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={{ color: '#728C74', fontSize: 12 }}>
                    📅 {format(plant.startDate, 'd MMM yyyy', { locale: es })}
                  </Text>
                  <Text style={{ color: '#728C74', fontSize: 12 }}>
                    {plant.location === 'indoor' ? '🏠' : '☀️'} {differenceInDays(new Date(), plant.startDate)}d
                  </Text>
                  <Text style={{ color: '#728C74', fontSize: 12 }}>
                    🪴 {plant.potCount}×{plant.potVolumeLiters}L
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
