import { useNavigate } from 'react-router-dom'
import { format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card, Badge } from '@/components/ui'
import { getCurrentWeek, getEstimatedHarvestDate, awaitingFloraStart } from '@/lib/nutrition-utils'
import { useTasks } from '@/hooks/useTasks'
import type { Plant } from '@/types/plant'

interface PlantCardProps {
  plant: Plant
}

const stageLabels: Record<string, string> = {
  rooting: 'Enraizamiento',
  growth: 'Crecimiento',
  preflower: 'Prefloración',
  stretch: 'Estiramiento',
  bulking: 'Engorde',
  ripening: 'Maduración',
  flushing: 'Limpieza',
  harvested: 'Cosechada',
}

export default function PlantCard({ plant }: PlantCardProps) {
  const navigate = useNavigate()
  const { todayTasks } = useTasks(plant.id)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const currentWeek = getCurrentWeek(plant, today)
  const harvestDate = getEstimatedHarvestDate(plant)
  const daysToHarvest = harvestDate ? differenceInDays(harvestDate, today) : null
  const needsFlora = awaitingFloraStart(plant)
  const pendingToday = todayTasks.filter((t) => !t.completed).length

  const cycleLabel = currentWeek
    ? currentWeek.cycle === 'vege'
      ? `VEGE S${currentWeek.week}`
      : `FLORA F${currentWeek.week}`
    : '—'

  const cycleVariant = currentWeek?.cycle === 'flora' ? 'amber' : 'green'

  return (
    <Card onClick={() => navigate(`/plants/${plant.id}`)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{plant.name}</h3>
          <p className="text-sm text-gray-500 truncate">{plant.genetics}</p>
        </div>
        <Badge variant={cycleVariant} className="shrink-0">
          {cycleLabel}
        </Badge>
      </div>

      <div className="mt-3 flex items-center gap-3 text-sm text-gray-500">
        {currentWeek && (
          <span>{stageLabels[currentWeek.stage] ?? currentWeek.stage}</span>
        )}
        {daysToHarvest !== null && daysToHarvest > 0 && (
          <>
            <span className="text-gray-300">·</span>
            <span>Cosecha en {daysToHarvest}d</span>
          </>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        {pendingToday > 0 && (
          <Badge variant="blue">
            {pendingToday} tarea{pendingToday > 1 ? 's' : ''} hoy
          </Badge>
        )}
        {needsFlora && (
          <Badge variant="amber">Iniciar floración</Badge>
        )}
        {pendingToday === 0 && !needsFlora && (
          <span className="text-xs text-gray-400">Sin tareas hoy</span>
        )}
      </div>

      {harvestDate && (
        <p className="mt-2 text-xs text-gray-400">
          Cosecha est.: {format(harvestDate, "d 'de' MMM yyyy", { locale: es })}
        </p>
      )}
    </Card>
  )
}
