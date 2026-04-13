import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { clsx } from 'clsx'
import type { ScheduledTask } from '@/types/plant'

const typeLabels: Record<string, string> = {
  irrigation: 'Riego',
  observation: 'Observación',
  foliar: 'Foliar',
  harvest: 'Cosecha',
}

const typeColors: Record<string, string> = {
  nutrition: 'bg-brand-400',
  irrigation: 'bg-blue-400',
  observation: 'bg-amber-400',
  foliar: 'bg-purple-400',
  harvest: 'bg-red-400',
}

interface TaskItemProps {
  task: ScheduledTask
  onComplete?: (id: string) => void
  showDate?: boolean
}

function getMainLabel(task: ScheduledTask): string {
  if (task.type === 'nutrition') {
    if (task.products.length === 0) return 'Solo agua'
    return task.products.map((p) => p.name).join(' · ')
  }
  return typeLabels[task.type] ?? task.type
}

export default function TaskItem({ task, onComplete, showDate = false }: TaskItemProps) {
  return (
    <div className={clsx('flex items-center gap-3 py-2.5', task.completed && 'opacity-50')}>
      <div className={clsx('w-2 h-2 rounded-full shrink-0 mt-0.5', typeColors[task.type] ?? 'bg-gray-300')} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className={clsx('text-sm font-medium truncate', task.completed && 'line-through text-gray-400')}>
            {getMainLabel(task)}
          </span>
          <span className="text-xs text-gray-400 shrink-0">
            {task.cycle === 'vege' ? `V${task.week}` : `F${task.week}`}
          </span>
        </div>
        {showDate && (
          <p className="text-xs text-gray-400 mt-0.5">
            {format(task.scheduledDate, 'EEEE d MMM', { locale: es })}
          </p>
        )}
      </div>
      {onComplete && !task.completed && (
        <button
          onClick={() => onComplete(task.id)}
          className="text-xs text-brand-600 hover:text-brand-400 font-medium shrink-0 px-2 py-1 rounded hover:bg-brand-50 transition-colors"
        >
          Hecho
        </button>
      )}
    </div>
  )
}
