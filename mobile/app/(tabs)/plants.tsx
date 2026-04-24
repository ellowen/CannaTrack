import { useState, useMemo, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { usePlants } from '@/hooks/usePlants'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { Plant } from '@shared/types/plant'

type FilterType = 'active' | 'all' | 'archived'

export default function PlantsScreen() {
  const { user } = useAuth()
  const { plants } = usePlants()
  const [filter, setFilter] = useState<FilterType>('active')
  const [showNewModal, setShowNewModal] = useState(false)
  const [archived, setArchived] = useState<Plant[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    genetics: '',
    geneticType: 'feminized' as Plant['geneticType'],
    startDate: format(new Date(), 'yyyy-MM-dd'),
    location: 'indoor' as Plant['location'],
    potCount: '1',
    potVolumeLiters: '11',
  })

  useEffect(() => {
    loadArchived()
  }, [user])

  const loadArchived = async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('plants')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['harvested', 'discarded'])
      .order('created_at', { ascending: false })

    if (data) {
      setArchived(
        data.map(row => ({
          id: row.id as string,
          name: row.name as string,
          genetics: row.genetics as string,
          geneticType: row.genetic_type as Plant['geneticType'],
          sex: (row.sex as Plant['sex']) ?? 'unknown',
          startDate: new Date(row.start_date as string),
          floraStartDate: row.flora_start_date ? new Date(row.flora_start_date as string) : undefined,
          autoFlowerTotalDays: (row.auto_flower_total_days as number) ?? 75,
          location: (row.location as Plant['location']) ?? 'indoor',
          potCount: (row.pot_count as number) ?? 1,
          potVolumeLiters: (row.pot_volume_liters as number) ?? 11,
          nutritionTableId: (row.nutrition_table_id as string) ?? 'revegetar',
          availableProducts: (row.available_products as string[]) ?? [],
          status: (row.status as Plant['status']) ?? 'archived',
          notes: (row.notes as string) ?? '',
        }))
      )
    }
    setLoading(false)
  }

  const filteredPlants = useMemo(() => {
    switch (filter) {
      case 'all':
        return [...plants, ...archived]
      case 'archived':
        return archived
      case 'active':
      default:
        return plants
    }
  }, [plants, archived, filter])

  const handleCreatePlant = async () => {
    if (!user || !formData.name.trim()) {
      Alert.alert('Error', 'Ingresa un nombre para la planta')
      return
    }

    const { error } = await supabase.from('plants').insert({
      user_id: user.id,
      name: formData.name.trim(),
      genetics: formData.genetics.trim() || 'Unknown',
      genetic_type: formData.geneticType,
      start_date: new Date(formData.startDate).toISOString(),
      location: formData.location,
      pot_count: parseInt(formData.potCount) || 1,
      pot_volume_liters: parseInt(formData.potVolumeLiters) || 11,
      nutrition_table_id: 'revegetar',
      status: 'active',
    })

    if (error) {
      Alert.alert('Error', error.message)
      return
    }

    setFormData({
      name: '',
      genetics: '',
      geneticType: 'feminized',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      location: 'indoor',
      potCount: '1',
      potVolumeLiters: '11',
    })
    setShowNewModal(false)
    await loadArchived()
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ color: '#E4F2E7', fontSize: 28, fontWeight: '900' }}>Mis plantas</Text>
            <TouchableOpacity
              onPress={() => setShowNewModal(true)}
              style={{ backgroundColor: '#52CC64', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 }}
            >
              <Text style={{ color: '#0C1410', fontWeight: '700', fontSize: 13 }}>+ Nueva</Text>
            </TouchableOpacity>
          </View>

          {/* Filter Tabs */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['active', 'all', 'archived'] as const).map(f => (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 12,
                  backgroundColor: f === filter ? '#52CC64' : '#131D14',
                  borderWidth: 1,
                  borderColor: f === filter ? '#52CC64' : '#1C2E1E',
                }}
              >
                <Text
                  style={{
                    color: f === filter ? '#0C1410' : '#728C74',
                    fontWeight: '600',
                    fontSize: 12,
                    textTransform: 'capitalize',
                  }}
                >
                  {f === 'active' ? 'Activas' : f === 'all' ? 'Todas' : 'Descartadas'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Plants Grid */}
        {loading ? (
          <View style={{ paddingHorizontal: 16 }}>
            <Text style={{ color: '#728C74', textAlign: 'center', paddingVertical: 20 }}>Cargando...</Text>
          </View>
        ) : filteredPlants.length === 0 ? (
          <View style={{ paddingHorizontal: 16 }}>
            <TouchableOpacity
              onPress={() => setShowNewModal(true)}
              style={{
                backgroundColor: '#131D14',
                borderRadius: 20,
                borderWidth: 2,
                borderColor: '#52CC64',
                borderStyle: 'dashed',
                padding: 40,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🌱</Text>
              <Text style={{ color: '#E4F2E7', fontWeight: '900', fontSize: 17 }}>Sin plantas</Text>
              <Text style={{ color: '#728C74', fontSize: 13, marginTop: 6, textAlign: 'center' }}>
                Crea tu primera planta para empezar a cultivar
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            scrollEnabled={false}
            data={filteredPlants}
            keyExtractor={p => p.id}
            maxToRenderPerBatch={15}
            updateCellsBatchingPeriod={50}
            initialNumToRender={10}
            windowSize={10}
            removeClippedSubviews={true}
            renderItem={({ item: plant }) => (
              <TouchableOpacity
                onPress={() => router.push(`/plants/${plant.id}`)}
                activeOpacity={0.85}
                style={{
                  marginHorizontal: 16,
                  marginBottom: 12,
                  backgroundColor: '#131D14',
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: '#1C2E1E',
                  overflow: 'hidden',
                }}
              >
                <View style={{ backgroundColor: plant.status === 'active' ? '#1A3D1E' : '#1A1A1A', padding: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <View style={{ backgroundColor: '#0D2010', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ color: plant.status === 'active' ? '#52CC64' : '#728C74', fontSize: 10, fontWeight: '800' }}>
                        {plant.geneticType === 'autoflower' ? 'AUTO' : plant.geneticType === 'feminized' ? 'FEM' : 'REG'}
                      </Text>
                    </View>
                    <Text style={{ color: plant.status === 'active' ? '#6DC278' : '#728C74', fontSize: 11, fontWeight: '600' }}>
                      {plant.floraStartDate ? 'FLORA' : 'VEGE'}
                    </Text>
                  </View>
                  <Text style={{ color: '#E4F2E7', fontSize: 20, fontWeight: '900' }}>{plant.name}</Text>
                  <Text style={{ color: plant.status === 'active' ? '#6DC278' : '#728C74', fontSize: 13, marginTop: 2 }}>
                    {plant.genetics}
                  </Text>
                </View>

                <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={{ color: '#728C74', fontSize: 12 }}>📅 {format(plant.startDate, 'd MMM', { locale: es })}</Text>
                  <Text style={{ color: '#728C74', fontSize: 12 }}>
                    {plant.location === 'indoor' ? '🏠' : '☀️'} {differenceInDays(new Date(), plant.startDate)}d
                  </Text>
                  <Text style={{ color: '#728C74', fontSize: 12 }}>🪴 {plant.potCount}×{plant.potVolumeLiters}L</Text>
                </View>
              </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingHorizontal: 0 }}
          />
        )}
      </ScrollView>

      {/* Modal Nueva Planta */}
      <Modal visible={showNewModal} animationType="slide" transparent={true}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410' }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1C2E1E' }}>
              <Text style={{ color: '#E4F2E7', fontSize: 18, fontWeight: '700' }}>Nueva planta</Text>
              <TouchableOpacity onPress={() => setShowNewModal(false)}>
                <Text style={{ color: '#728C74', fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
              {/* Nombre */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: '#E4F2E7', fontSize: 12, fontWeight: '600', marginBottom: 6 }}>Nombre</Text>
                <TextInput
                  value={formData.name}
                  onChangeText={name => setFormData(prev => ({ ...prev, name }))}
                  placeholder="Ej: Plant #1"
                  placeholderTextColor="#3A5040"
                  style={{
                    backgroundColor: '#131D14',
                    borderWidth: 1,
                    borderColor: '#1C2E1E',
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    color: '#E4F2E7',
                    fontSize: 14,
                  }}
                />
              </View>

              {/* Genética */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: '#E4F2E7', fontSize: 12, fontWeight: '600', marginBottom: 6 }}>Genética</Text>
                <TextInput
                  value={formData.genetics}
                  onChangeText={genetics => setFormData(prev => ({ ...prev, genetics }))}
                  placeholder="Ej: Blue Dream"
                  placeholderTextColor="#3A5040"
                  style={{
                    backgroundColor: '#131D14',
                    borderWidth: 1,
                    borderColor: '#1C2E1E',
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    color: '#E4F2E7',
                    fontSize: 14,
                  }}
                />
              </View>

              {/* Tipo */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: '#E4F2E7', fontSize: 12, fontWeight: '600', marginBottom: 6 }}>Tipo</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(['feminized', 'autoflower', 'regular'] as const).map(type => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setFormData(prev => ({ ...prev, geneticType: type }))}
                      style={{
                        flex: 1,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderRadius: 12,
                        backgroundColor: formData.geneticType === type ? '#52CC64' : '#131D14',
                        borderWidth: 1,
                        borderColor: formData.geneticType === type ? '#52CC64' : '#1C2E1E',
                      }}
                    >
                      <Text style={{
                        color: formData.geneticType === type ? '#0C1410' : '#728C74',
                        fontWeight: '600',
                        fontSize: 12,
                        textAlign: 'center',
                      }}>
                        {type === 'feminized' ? 'FEM' : type === 'autoflower' ? 'AUTO' : 'REG'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Fecha */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: '#E4F2E7', fontSize: 12, fontWeight: '600', marginBottom: 6 }}>Fecha inicio</Text>
                <TextInput
                  value={formData.startDate}
                  onChangeText={startDate => setFormData(prev => ({ ...prev, startDate }))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#3A5040"
                  style={{
                    backgroundColor: '#131D14',
                    borderWidth: 1,
                    borderColor: '#1C2E1E',
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    color: '#E4F2E7',
                    fontSize: 14,
                  }}
                />
              </View>

              {/* Ubicación */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: '#E4F2E7', fontSize: 12, fontWeight: '600', marginBottom: 6 }}>Ubicación</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(['indoor', 'outdoor'] as const).map(loc => (
                    <TouchableOpacity
                      key={loc}
                      onPress={() => setFormData(prev => ({ ...prev, location: loc }))}
                      style={{
                        flex: 1,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderRadius: 12,
                        backgroundColor: formData.location === loc ? '#52CC64' : '#131D14',
                        borderWidth: 1,
                        borderColor: formData.location === loc ? '#52CC64' : '#1C2E1E',
                      }}
                    >
                      <Text style={{
                        color: formData.location === loc ? '#0C1410' : '#728C74',
                        fontWeight: '600',
                        fontSize: 12,
                        textAlign: 'center',
                      }}>
                        {loc === 'indoor' ? '🏠' : '☀️'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Macetas */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: '#E4F2E7', fontSize: 12, fontWeight: '600', marginBottom: 6 }}>Macetas</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#728C74', fontSize: 11, marginBottom: 4 }}>Cantidad</Text>
                    <TextInput
                      value={formData.potCount}
                      onChangeText={potCount => setFormData(prev => ({ ...prev, potCount }))}
                      keyboardType="number-pad"
                      style={{
                        backgroundColor: '#131D14',
                        borderWidth: 1,
                        borderColor: '#1C2E1E',
                        borderRadius: 12,
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        color: '#E4F2E7',
                        fontSize: 14,
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#728C74', fontSize: 11, marginBottom: 4 }}>Litros</Text>
                    <TextInput
                      value={formData.potVolumeLiters}
                      onChangeText={potVolumeLiters => setFormData(prev => ({ ...prev, potVolumeLiters }))}
                      keyboardType="number-pad"
                      style={{
                        backgroundColor: '#131D14',
                        borderWidth: 1,
                        borderColor: '#1C2E1E',
                        borderRadius: 12,
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        color: '#E4F2E7',
                        fontSize: 14,
                      }}
                    />
                  </View>
                </View>
              </View>

              {/* Botones */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  onPress={() => setShowNewModal(false)}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: '#131D14',
                    borderWidth: 1,
                    borderColor: '#1C2E1E',
                  }}
                >
                  <Text style={{ color: '#728C74', textAlign: 'center', fontWeight: '600' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCreatePlant}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: '#52CC64',
                  }}
                >
                  <Text style={{ color: '#0C1410', textAlign: 'center', fontWeight: '700' }}>Crear</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}
