import { Card, Badge } from '@/components/ui'
import DoseList from './DoseList'
import type { ScheduledTask } from '@/types/plant'

interface NutritionCardProps {
  task: ScheduledTask
  potVolumeLiters: number
}

export default function NutritionCard({ task, potVolumeLiters }: NutritionCardProps) {
  const weekLabel = task.cycle === 'vege' ? `V${task.week}` : `F${task.week}`
  const cycleVariant = task.cycle === 'flora' ? 'amber' : 'green'

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge variant={cycleVariant}>Semana {weekLabel}</Badge>
          <span className="text-sm text-gray-500 capitalize">{task.stage}</span>
        </div>
        {task.ecMin !== undefined && (
          <div className="text-xs text-gray-400 text-right">
            <div>EC {task.ecMin}–{task.ecMax}</div>
            <div>pH {task.phMin}–{task.phMax}</div>
          </div>
        )}
      </div>
      {task.products.length > 0 ? (
        <DoseList products={task.products} liters={potVolumeLiters} />
      ) : (
        <p className="text-sm text-gray-500">Solo agua — semana de limpieza</p>
      )}
    </Card>
  )
}
