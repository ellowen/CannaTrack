import { addDays, format, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { clsx } from 'clsx'
import { getTasksForDate } from '@/lib/nutrition-utils'
import type { ScheduledTask } from '@/types/plant'

interface WeekViewProps {
  tasks: ScheduledTask[]
  weekStart: Date
  today: Date
  onDayClick?: (date: Date) => void
}

export default function WeekView({ tasks, weekStart, today, onDayClick }: WeekViewProps) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map((day) => {
        const dayTasks = getTasksForDate(tasks, day)
        const isToday = isSameDay(day, today)
        const hasTasks = dayTasks.length > 0
        const pendingCount = dayTasks.filter((t) => !t.completed).length

        return (
          <button
            key={day.toISOString()}
            onClick={() => onDayClick?.(day)}
            className={clsx(
              'flex flex-col items-center gap-1 py-2 rounded-lg transition-colors',
              isToday
                ? 'bg-brand-400 text-white'
                : hasTasks
                ? 'bg-brand-50 hover:bg-brand-100'
                : 'hover:bg-gray-50'
            )}
          >
            <span className={clsx('text-xs font-medium', isToday ? 'text-white' : 'text-gray-500')}>
              {format(day, 'EEE', { locale: es }).slice(0, 2)}
            </span>
            <span className={clsx('text-sm font-semibold', isToday ? 'text-white' : 'text-gray-900')}>
              {format(day, 'd')}
            </span>
            {hasTasks && (
              <span
                className={clsx(
                  'w-1.5 h-1.5 rounded-full',
                  pendingCount > 0
                    ? isToday ? 'bg-white' : 'bg-brand-400'
                    : isToday ? 'bg-brand-200' : 'bg-gray-300'
                )}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
