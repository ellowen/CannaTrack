import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { clsx } from 'clsx'
import type { ScheduledTask } from '@/types/plant'

const typeIcon: Record<string, string> = {
  nutrition:   '🍃',
  irrigation:  '💧',
  observation: '🔍',
  foliar:      '🌫️',
  harvest:     '✂️',
}
const typeLabel: Record<string, string> = {
  nutrition:   'Nutrición',
  irrigation:  'Riego',
  observation: 'Observación',
  foliar:      'Foliar',
  harvest:     'Cosecha',
}

interface TaskItemProps {
  task: ScheduledTask
  onComplete?: (id: string) => void
  showDate?: boolean
}

function getMainLabel(task: ScheduledTask): string {
  if (task.type === 'nutrition') {
    if (task.products.length === 0) return 'Solo agua 💧'
    return task.products.map((p) => p.name).join(' · ')
  }
  return typeLabel[task.type] ?? task.type
}

export default function TaskItem({ task, onComplete, showDate = false }: TaskItemProps) {
  return (
    <div className={clsx(
      'flex items-center gap-3 py-3 px-1',
      task.completed && 'opacity-50'
    )}>
      <span className="text-xl shrink-0">{typeIcon[task.type] ?? '📌'}</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className={clsx(
            'text-sm font-semibold truncate',
            task.completed ? 'line-through text-ink-4' : 'text-ink-1'
          )}>
            {getMainLabel(task)}
          </span>
          <span className="text-[11px] font-bold text-ink-4 shrink-0">
            {task.cycle === 'vege' ? `V${task.week}` : `F${task.week}`}
          </span>
        </div>
        {showDate && (
          <p className="text-xs text-ink-3 mt-0.5 capitalize">
            {format(task.scheduledDate, 'EEEE d MMM', { locale: es })}
          </p>
        )}
      </div>

      {onComplete && !task.completed && (
        <button
          onClick={() => onComplete(task.id)}
          className="shrink-0 text-xs font-bold text-brand-500 bg-brand-subtle border border-brand-border px-3 py-1.5 rounded-xl tap-highlight-none active:scale-95 transition-all"
        >
          Hecho
        </button>
      )}
      {task.completed && (
        <span className="text-base shrink-0">✅</span>
      )}
    </div>
  )
}
