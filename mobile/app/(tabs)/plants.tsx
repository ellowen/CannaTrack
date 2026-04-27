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
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
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
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
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

  async function onRefresh() {
    setRefreshing(true)
    await loadArchived()
    setRefreshing(false)
  }

  const filteredPlants = useMemo(() => {
    let filtered: Plant[] = []
    switch (filter) {
      case 'all':
        filtered = [...plants, ...archived]
        break
      case 'archived':
        filtered = archived
        break
      case 'active':
      default:
        filtered = plants
        break
    }

    if (!searchQuery.trim()) return filtered

    const query = searchQuery.toLowerCase()
    return filtered.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.genetics.toLowerCase().includes(query) ||
      p.geneticType.toLowerCase().includes(query)
    )
  }, [plants, archived, filter, searchQuery])

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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080E09' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <LinearGradient colors={['#0F1F10', '#080E09']} style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ color: '#E8F5EA', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 }}>Mis plantas</Text>
            <TouchableOpacity onPress={() => setShowNewModal(true)} activeOpacity={0.85} style={{ borderRadius: 14, overflow: 'hidden' }}>
              <LinearGradient colors={['#52CC64', '#3DAA50']} style={{ paddingHorizontal: 16, paddingVertical: 9 }}>
                <Text style={{ color: '#080E09', fontWeight: '900', fontSize: 13 }}>+ Nueva</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar por nombre, genetica..."
            placeholderTextColor="#2D4A30"
            style={{ backgroundColor: '#0D1A0F', borderWidth: 1, borderColor: '#1A3020', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: '#E8F5EA', fontSize: 14, marginBottom: 14 }}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {([['active', 'Activas'], ['all', 'Todas'], ['archived', 'Historial']] as const).map(([f, label]) => (
              <TouchableOpacity key={f} onPress={() => setFilter(f)} activeOpacity={0.8} style={{ borderRadius: 12, overflow: 'hidden' }}>
                {f === filter ? (
                  <LinearGradient colors={['#52CC64', '#3DAA50']} style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
                    <Text style={{ color: '#080E09', fontWeight: '900', fontSize: 12 }}>{label}</Text>
                  </LinearGradient>
                ) : (
                  <View style={{ paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#0D1A0F', borderRadius: 12, borderWidth: 1, borderColor: '#1A3020' }}>
                    <Text style={{ color: '#4A7A50', fontWeight: '700', fontSize: 12 }}>{label}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </LinearGradient>

        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ color: '#3D6642', fontSize: 14 }}>Cargando...</Text>
          </View>
        ) : filteredPlants.length === 0 ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
            <TouchableOpacity onPress={() => setShowNewModal(true)} activeOpacity={0.85}>
              <LinearGradient colors={['#0D1A0F', '#080E09']} style={{ borderRadius: 22, padding: 40, alignItems: 'center', borderWidth: 2, borderColor: '#1A3020', borderStyle: 'dashed' }}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>🌱</Text>
                <Text style={{ color: '#E8F5EA', fontWeight: '900', fontSize: 17 }}>Sin plantas</Text>
                <Text style={{ color: '#3D6642', fontSize: 13, marginTop: 6, textAlign: 'center' }}>Crea tu primera planta para empezar a cultivar</Text>
              </LinearGradient>
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
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#52CC64" />}
            renderItem={({ item: plant }) => {
              const isActive  = plant.status === 'active'
              const isFlora   = !!plant.floraStartDate
              const totalDays = differenceInDays(new Date(), plant.startDate)
              const phaseDay  = isFlora && plant.floraStartDate
                ? differenceInDays(new Date(), plant.floraStartDate) + 1
                : totalDays + 1

              return (
                <TouchableOpacity onPress={() => router.push(`/plants/${plant.id}`)} activeOpacity={0.85} style={{ marginHorizontal: 16, marginBottom: 12 }}>
                  <LinearGradient
                    colors={
                      !isActive ? ['#101010', '#080808'] :
                      isFlora ? ['#1A0E00', '#0E0800', '#080A09'] :
                      ['#0D1A0F', '#070D08', '#080A09']
                    }
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ borderRadius: 20, borderWidth: 1, borderColor: !isActive ? '#1A1A1A' : isFlora ? '#3D2000' : '#162A18', overflow: 'hidden' }}
                  >
                    <View style={{ padding: 16 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        <LinearGradient
                          colors={!isActive ? ['#1A1A1A', '#111111'] : isFlora ? ['#3D2000', '#1F1000'] : ['#1A3D1E', '#0D2010']}
                          style={{ width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14, borderWidth: 1, borderColor: !isActive ? '#2A2A2A' : isFlora ? '#6B3800' : '#2A5A2E' }}
                        >
                          <Text style={{ fontSize: 22 }}>{!isActive ? (plant.status === 'harvested' ? '✂️' : '🗑️') : isFlora ? '🌸' : '🌿'}</Text>
                        </LinearGradient>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 5 }}>
                            <View style={{ backgroundColor: isActive ? (isFlora ? '#3D2000' : '#1A3D1E') : '#1A1A1A', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                              <Text style={{ color: isActive ? (isFlora ? '#F59E0B' : '#52CC64') : '#555', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 }}>
                                {isFlora ? 'FLORA' : 'VEGE'}
                              </Text>
                            </View>
                            <View style={{ backgroundColor: '#0D1A10', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                              <Text style={{ color: '#4A7A50', fontSize: 9, fontWeight: '700' }}>
                                {plant.geneticType === 'autoflower' ? 'AUTO' : plant.geneticType === 'feminized' ? 'FEM' : 'REG'}
                              </Text>
                            </View>
                            {!isActive && (
                              <View style={{ backgroundColor: plant.status === 'harvested' ? '#0D2010' : '#1A0808', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                                <Text style={{ color: plant.status === 'harvested' ? '#52CC64' : '#EF4444', fontSize: 9, fontWeight: '900' }}>
                                  {plant.status === 'harvested' ? 'COSECHADA' : 'DESCARTADA'}
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text style={{ color: isActive ? '#E8F5EA' : '#888', fontSize: 18, fontWeight: '900' }}>{plant.name}</Text>
                          <Text style={{ color: isActive ? (isFlora ? '#A06020' : '#4A7A50') : '#555', fontSize: 12, marginTop: 1 }}>{plant.genetics}</Text>
                        </View>
                        {isActive && (
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ color: isFlora ? '#F59E0B' : '#52CC64', fontSize: 24, fontWeight: '900', lineHeight: 26 }}>D{phaseDay}</Text>
                            <Text style={{ color: isFlora ? '#6B3800' : '#2A5A2E', fontSize: 9, fontWeight: '700' }}>S{Math.ceil(phaseDay / 7)}</Text>
                          </View>
                        )}
                      </View>
                      <View style={{ flexDirection: 'row', gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: !isActive ? '#1A1A1A' : isFlora ? '#2D1800' : '#142214' }}>
                        <Text style={{ color: !isActive ? '#444' : isFlora ? '#5A3010' : '#2A4A2E', fontSize: 11 }}>📅 {format(plant.startDate, 'd MMM yyyy', { locale: es })}</Text>
                        <Text style={{ color: !isActive ? '#444' : isFlora ? '#5A3010' : '#2A4A2E', fontSize: 11 }}>{plant.location === 'indoor' ? '🏠' : '☀️'} {totalDays}d</Text>
                        <Text style={{ color: !isActive ? '#444' : isFlora ? '#5A3010' : '#2A4A2E', fontSize: 11 }}>🪴 {plant.potCount}×{plant.potVolumeLiters}L</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              )
            }}
            contentContainerStyle={{ paddingTop: 12 }}
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
