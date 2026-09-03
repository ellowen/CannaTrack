import { View, Text, TouchableOpacity } from 'react-native'
import { format, differenceInDays } from 'date-fns'
import { useDateLocale } from '@/lib/dateLocale'
import type { Plant, ScheduledTask } from '@shared/types/plant'
import { useTranslation } from '@/i18n'

interface PlantCardProps {
  plant: Plant
  overdueTasks?: number
  pendingTasks?: number
  onPress: () => void
}

export function PlantCard({ plant, overdueTasks = 0, pendingTasks = 0, onPress }: PlantCardProps) {
  const { t } = useTranslation()
  const dateLocale = useDateLocale()
  const daysAlive = differenceInDays(new Date(), plant.startDate)
  const hasWarnings = overdueTasks > 0
  const statusColor = hasWarnings ? '#EF4444' : pendingTasks > 0 ? '#F59E0B' : '#52CC64'
  const statusText = hasWarnings
    ? t('plantCard.status_overdue', { count: overdueTasks })
    : pendingTasks > 0
      ? t('plantCard.status_pending', { count: pendingTasks })
      : t('plantCard.status_up_to_date')

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
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
              {plant.geneticType === 'autoflower' ? t('plantCard.genetic_auto') : plant.geneticType === 'feminized' ? t('plantCard.genetic_fem') : t('plantCard.genetic_reg')}
            </Text>
          </View>
          <Text style={{ color: plant.status === 'active' ? '#6DC278' : '#728C74', fontSize: 11, fontWeight: '600' }}>
            {plant.floraStartDate ? t('plantCard.stage_flora') : t('plantCard.stage_vege')}
          </Text>
        </View>
        <Text style={{ color: '#E4F2E7', fontSize: 20, fontWeight: '900' }}>{plant.name}</Text>
        <Text style={{ color: plant.status === 'active' ? '#6DC278' : '#728C74', fontSize: 13, marginTop: 2 }}>
          {plant.genetics}
        </Text>
      </View>

      <View style={{ padding: 14, gap: 10 }}>
        {/* Plant info row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ color: '#728C74', fontSize: 12 }}>
            📅 {format(plant.startDate, 'd MMM', { locale: dateLocale })}
          </Text>
          <Text style={{ color: '#728C74', fontSize: 12 }}>
            {plant.location === 'indoor' ? '🏠' : '☀️'} {daysAlive}d
          </Text>
          <Text style={{ color: '#728C74', fontSize: 12 }}>
            🪴 {plant.potCount}×{plant.potVolumeLiters}L
          </Text>
        </View>

        {/* Status indicator */}
        {(overdueTasks > 0 || pendingTasks > 0) && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 10,
            paddingVertical: 6,
            backgroundColor: hasWarnings ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
            borderRadius: 8,
            borderWidth: 1,
            borderColor: statusColor,
          }}>
            <Text style={{ fontSize: 12 }}>{hasWarnings ? '⚠️' : '⏱️'}</Text>
            <Text style={{ color: statusColor, fontSize: 12, fontWeight: '600' }}>
              {statusText}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}
