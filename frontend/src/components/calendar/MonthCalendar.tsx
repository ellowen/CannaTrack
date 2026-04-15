import { useMemo } from 'react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, format, isSameDay, isSameMonth,
} from 'date-fns'
import { clsx } from 'clsx'
import { getTasksForDate } from '@/lib/nutrition-utils'
import type { ScheduledTask } from '@/types/plant'

// Colores de punto por tipo (clases completas para Tailwind)
const TYPE_COLOR: Record<string, string> = {
  nutrition:   '#22C55E',
  irrigation:  '#3B82F6',
  observation: '#F59E0B',
  foliar:      '#A855F7',
  harvest:     '#EF4444',
}

const DAY_NAMES = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']

interface MonthCalendarProps {
  tasks: ScheduledTask[]
  month: Date          // any date within the target month
  today: Date
  selectedDate: Date
  animDir: 'left' | 'right' | null
  onDayClick: (date: Date) => void
}

export default function MonthCalendar({
  tasks, month, today, selectedDate, animDir, onDayClick,
}: MonthCalendarProps) {
  const cells = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
    const end   = endOfWeek(endOfMonth(month),     { weekStartsOn: 1 })
    const days: Date[] = []
    let cur = start
    while (cur <= end) { days.push(cur); cur = addDays(cur, 1) }
    return days
  }, [month])

  const animClass = animDir === 'left' ? 'cal-slide-left' : animDir === 'right' ? 'cal-slide-right' : ''

  return (
    <div>
      {/* Cabecera de días */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-[10px] font-bold text-ink-4 uppercase tracking-widest py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Grid mensual */}
      <div key={format(month, 'yyyy-MM')} className={clsx('grid grid-cols-7', animClass)}>
        {cells.map((day) => {
          const inMonth  = isSameMonth(day, month)
          const isToday  = isSameDay(day, today)
          const isSel    = isSameDay(day, selectedDate)
          const dayTasks = getTasksForDate(tasks, day)
          const pending  = dayTasks.filter((t) => !t.completed)
          const allDone  = dayTasks.length > 0 && pending.length === 0

          // Tipos únicos de tareas pendientes (máx 4 puntos)
          const types = [...new Set(pending.map((t) => t.type))].slice(0, 4)

          return (
            <button
              key={day.toISOString()}
              onClick={() => inMonth && onDayClick(day)}
              disabled={!inMonth}
              className={clsx(
                'flex flex-col items-center pb-2 pt-1.5 rounded-2xl transition-all duration-100 tap-highlight-none',
                inMonth ? 'active:scale-90' : 'pointer-events-none',
              )}
            >
              {/* Número del día */}
              <div className={clsx(
                'w-8 h-8 flex items-center justify-center rounded-full text-sm font-black transition-all duration-150',
                isSel  ? 'bg-brand-400 text-white shadow-glow-brand scale-110'
                : isToday ? 'ring-2 ring-brand-400 text-brand-400'
                : inMonth ? 'text-ink-1'
                : 'text-ink-4 opacity-30',
              )}>
                {format(day, 'd')}
              </div>

              {/* Puntos de actividad */}
              <div className="flex gap-[3px] mt-1 h-[7px] items-center">
                {types.length > 0
                  ? types.map((type) => (
                      <span
                        key={type}
                        className="w-[5px] h-[5px] rounded-full"
                        style={{ backgroundColor: TYPE_COLOR[type] ?? '#9CA3AF' }}
                      />
                    ))
                  : allDone
                  ? <span className="w-[5px] h-[5px] rounded-full bg-brand-200" />
                  : <span className="w-[5px] h-[5px]" />
                }
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
