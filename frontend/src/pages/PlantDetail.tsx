import { useParams, useNavigate } from 'react-router-dom'
import { format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { usePlants } from '@/hooks/usePlants'
import { useTasks } from '@/hooks/useTasks'
import { useNutritionTable } from '@/hooks/useNutritionTable'
import { useUserStore } from '@/store/userStore'
import { Button, Badge, Card } from '@/components/ui'
import { NutritionCard } from '@/components/nutrition'
import { TaskItem } from '@/components/calendar'
import { getCurrentWeek, getEstimatedHarvestDate, awaitingFloraStart } from '@/lib/nutrition-utils'

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

export default function PlantDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getPlantById, startFlora, harvestPlant, discardPlant } = usePlants()
  const { todayTasks, upcomingTasks, completeTask } = useTasks(id)
  const { getTableById } = useNutritionTable()
  const { potVolumeLiters } = useUserStore()

  if (!id) return null
  const plant = getPlantById(id)

  if (!plant) {
    return (
      <div className="px-4 pt-6 text-center">
        <p className="text-gray-500 mb-4">Planta no encontrada.</p>
        <Button variant="ghost" onClick={() => navigate('/')}>
          Volver al inicio
        </Button>
      </div>
    )
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const currentWeek = getCurrentWeek(plant, today)
  const harvestDate = getEstimatedHarvestDate(plant)
  const daysToHarvest = harvestDate ? differenceInDays(harvestDate, today) : null
  const needsFlora = awaitingFloraStart(plant)
  const table = getTableById(plant.nutritionTableId)
  const potLiters = plant.potVolumeLiters ?? potVolumeLiters

  const cycleLabel = currentWeek
    ? currentWeek.cycle === 'vege'
      ? `VEGE S${currentWeek.week}`
      : `FLORA F${currentWeek.week}`
    : 'Completada'
  const cycleVariant = currentWeek?.cycle === 'flora' ? 'amber' : 'green'

  const todayNutrition = todayTasks.filter((t) => t.type === 'nutrition')
  const todayOther = todayTasks.filter((t) => t.type !== 'nutrition')
  const upcoming = upcomingTasks.filter((t) => !todayTasks.some((d) => d.id === t.id))

  function handleStartFlora() {
    startFlora(plant!.id, new Date())
  }

  function handleHarvest() {
    if (confirm(`¿Confirmar cosecha de "${plant!.name}"?`)) {
      harvestPlant(plant!.id)
      navigate('/')
    }
  }

  function handleDiscard() {
    if (confirm(`¿Descartar "${plant!.name}"?`)) {
      discardPlant(plant!.id)
      navigate('/')
    }
  }

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-400 hover:text-gray-600 mt-1 shrink-0"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{plant.name}</h1>
          <p className="text-sm text-gray-500">{plant.genetics}</p>
        </div>
        <Badge variant={cycleVariant} className="shrink-0">{cycleLabel}</Badge>
      </div>

      {/* Info row */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-500">
        <span>Inicio: {format(plant.startDate, "d MMM yyyy", { locale: es })}</span>
        <span>·</span>
        <span>{plant.location === 'indoor' ? 'Indoor' : 'Outdoor'}</span>
        <span>·</span>
        <span>{plant.potCount} maceta{plant.potCount > 1 ? 's' : ''} · {potLiters}L</span>
      </div>

      {/* Current stage */}
      {currentWeek && (
        <Card className="bg-brand-50 border-brand-100">
          <p className="text-sm font-medium text-brand-800">
            {stageLabels[currentWeek.stage] ?? currentWeek.stage}
          </p>
          {harvestDate && daysToHarvest !== null && daysToHarvest > 0 && (
            <p className="text-xs text-brand-600 mt-0.5">
              Cosecha estimada en {daysToHarvest} días ·{' '}
              {format(harvestDate, "d MMM", { locale: es })}
            </p>
          )}
        </Card>
      )}

      {/* Flora alert */}
      {needsFlora && (
        <Card className="border-amber-200 bg-amber-50">
          <p className="text-sm font-medium text-amber-800 mb-3">
            Ya completaste las 6 semanas de vegetativo. ¿Iniciás floración?
          </p>
          <Button variant="primary" size="sm" onClick={handleStartFlora}>
            Iniciar floración hoy
          </Button>
        </Card>
      )}

      {/* Today's nutrition */}
      {todayNutrition.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Nutrición de hoy</h2>
          {todayNutrition.map((task) => (
            <div key={task.id} className="mb-3">
              <NutritionCard task={task} potVolumeLiters={potLiters} />
              {!task.completed && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => completeTask(task.id)}
                >
                  Marcar completada
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Today's other tasks */}
      {todayOther.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Otras tareas hoy</h2>
          <Card>
            <div className="divide-y divide-gray-100">
              {todayOther.map((task) => (
                <TaskItem key={task.id} task={task} onComplete={completeTask} />
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* No tasks today */}
      {todayTasks.length === 0 && (
        <Card>
          <p className="text-sm text-gray-500 text-center py-2">Sin tareas programadas para hoy</p>
        </Card>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Próximas tareas</h2>
          <Card>
            <div className="divide-y divide-gray-100">
              {upcoming.map((task) => (
                <TaskItem key={task.id} task={task} showDate />
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Actions */}
      <div className="pt-4 border-t border-gray-200 space-y-2">
        <Button variant="secondary" className="w-full" onClick={handleHarvest}>
          Cosechar planta
        </Button>
        <Button
          variant="ghost"
          className="w-full text-red-500 hover:bg-red-50"
          onClick={handleDiscard}
        >
          Descartar
        </Button>
      </div>

      {table && (
        <p className="text-xs text-center text-gray-400">
          Tabla: {table.name} · {potLiters}L por maceta
        </p>
      )}
    </div>
  )
}
