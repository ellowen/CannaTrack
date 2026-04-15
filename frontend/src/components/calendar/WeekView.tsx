import { addDays, format, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { clsx } from 'clsx'
import { getTasksForDate } from '@/lib/nutrition-utils'
import type { ScheduledTask } from '@/types/plant'

// Colores por tipo de tarea — deben ser clases completas para que Tailwind las incluya
const TYPE_DOT: Record<string, string> = {
  nutrition:   'bg-task-nutrition',
  irrigation:  'bg-task-irrigation',
  observation: 'bg-task-observation',
  foliar:      'bg-task-foliar',
  harvest:     'bg-task-harvest',
}

interface WeekViewProps {
  tasks: ScheduledTask[]
  weekStart: Date
  today: Date
  selectedDate?: Date
  onDayClick?: (date: Date) => void
}

export default function WeekView({ tasks, weekStart, today, selectedDate, onDayClick }: WeekViewProps) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map((day) => {
        const dayTasks = getTasksForDate(tasks, day)
        const isToday = isSameDay(day, today)
        const isSelected = selectedDate ? isSameDay(day, selectedDate) : isToday
        const pending = dayTasks.filter((t) => !t.completed)
        const done = dayTasks.filter((t) => t.completed)

        // Tipos únicos de tareas pendientes (máx 3 puntos)
        const pendingTypes = [...new Set(pending.map((t) => t.type))].slice(0, 3)
        const hasDone = done.length > 0 && pending.length === 0

        return (
          <button
            key={day.toISOString()}
            onClick={() => onDayClick?.(day)}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all duration-150 tap-highlight-none active:scale-95 relative"
          >
            {/* Día de la semana */}
            <span className={clsx(
              'text-[10px] font-bold uppercase tracking-wider',
              isSelected ? 'text-brand-400' : 'text-ink-4'
            )}>
              {format(day, 'EEE', { locale: es }).slice(0, 2)}
            </span>

            {/* Número — pill si seleccionado */}
            <span className={clsx(
              'w-9 h-9 flex items-center justify-center rounded-full text-sm font-black transition-all duration-150',
              isSelected
                ? 'bg-brand-400 text-white shadow-glow-brand'
                : isToday
                ? 'text-brand-400 ring-2 ring-brand-400'
                : 'text-ink-1'
            )}>
              {format(day, 'd')}
            </span>

            {/* Puntos de actividad */}
            <div className="flex gap-0.5 h-2 items-center">
              {pendingTypes.length > 0
                ? pendingTypes.map((type) => (
                    <span key={type} className={clsx('w-1.5 h-1.5 rounded-full', TYPE_DOT[type] ?? 'bg-ink-4')} />
                  ))
                : hasDone
                ? <span className="w-1.5 h-1.5 rounded-full bg-brand-200" />
                : null
              }
            </div>
          </button>
        )
      })}
    </div>
  )
}
