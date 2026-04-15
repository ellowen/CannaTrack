import { useState } from 'react'
import { addMonths, format, isSameDay, isSameMonth, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { useTasks } from '@/hooks/useTasks'
import { usePlants } from '@/hooks/usePlants'
import { MonthCalendar, TaskTimeline } from '@/components/calendar'
import { getTasksForDate } from '@/lib/nutrition-utils'

export default function Calendar() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [month, setMonth]       = useState(() => startOfMonth(today))
  const [selected, setSelected] = useState(today)
  const [animDir, setAnimDir]   = useState<'left' | 'right' | null>(null)

  const { tasks, completeTask } = useTasks()
  const { plants } = usePlants()

  const selectedTasks = getTasksForDate(tasks, selected)
  const pending = selectedTasks.filter((t) => !t.completed)

  const isThisMonth = isSameMonth(month, today)
  const isToday     = isSameDay(selected, today)

  function navigate(dir: 1 | -1) {
    setAnimDir(dir === 1 ? 'left' : 'right')
    setMonth((m) => addMonths(m, dir))
  }

  function goToToday() {
    setAnimDir(isSameMonth(month, today) ? null : today > month ? 'left' : 'right')
    setMonth(startOfMonth(today))
    setSelected(today)
  }

  function handleDayClick(day: Date) {
    setSelected(day)
    if (!isSameMonth(day, month)) {
      setAnimDir(day > month ? 'left' : 'right')
      setMonth(startOfMonth(day))
    }
  }

  function getPlantName(id: string) {
    return plants.find((p) => p.id === id)?.name ?? '—'
  }

  return (
    <div className="min-h-screen min-h-dvh">

      {/* ── Header sticky ─────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-app-bg/95 backdrop-blur-md border-b border-app-border/50">
        <div className="px-4 pt-8 pb-4">

          {/* Mes + año + controles */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold text-ink-4 uppercase tracking-[0.15em] mb-0.5">Calendario</p>
              <h1 className="text-2xl font-black text-ink-1 capitalize leading-none">
                {format(month, 'MMMM', { locale: es })}
                <span className="text-ink-3 font-semibold ml-2 text-lg">
                  {format(month, 'yyyy')}
                </span>
              </h1>
            </div>

            <div className="flex items-center gap-1.5">
              {!isThisMonth && (
                <button
                  onClick={goToToday}
                  className="text-xs font-bold text-brand-400 bg-brand-subtle border border-brand-border px-3 py-1.5 rounded-xl tap-highlight-none active:scale-95 transition-all"
                >
                  Hoy
                </button>
              )}
              <button
                onClick={() => navigate(-1)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-app-card border border-app-border text-ink-2 shadow-card tap-highlight-none active:scale-90 transition-all"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                onClick={() => navigate(1)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-app-card border border-app-border text-ink-2 shadow-card tap-highlight-none active:scale-90 transition-all"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          {/* Grilla mensual */}
          <MonthCalendar
            tasks={tasks}
            month={month}
            today={today}
            selectedDate={selected}
            animDir={animDir}
            onDayClick={handleDayClick}
          />
        </div>
      </div>

      {/* ── Detalle del día ────────────────────────────────────── */}
      <div className="px-4 pt-5 pb-8">

        {/* Encabezado día seleccionado */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-black text-ink-1 capitalize">
              {isToday
                ? '⚡ Hoy'
                : format(selected, "EEEE d 'de' MMMM", { locale: es })}
            </h2>
            {pending.length > 0 && (
              <p className="text-xs text-ink-3 mt-0.5">
                {pending.length} tarea{pending.length > 1 ? 's' : ''} pendiente{pending.length > 1 ? 's' : ''}
              </p>
            )}
            {selectedTasks.length > 0 && pending.length === 0 && (
              <p className="text-xs text-brand-400 font-semibold mt-0.5">✓ Todo completado</p>
            )}
          </div>

          {/* Leyenda de colores */}
          {selectedTasks.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 justify-end max-w-[160px]">
              {[...new Set(selectedTasks.map((t) => t.type))].map((type) => {
                const colors: Record<string, [string, string]> = {
                  nutrition:   ['#22C55E', 'Nutrición'],
                  irrigation:  ['#3B82F6', 'Riego'],
                  observation: ['#F59E0B', 'Obs.'],
                  foliar:      ['#A855F7', 'Foliar'],
                  harvest:     ['#EF4444', 'Cosecha'],
                }
                const [color, label] = colors[type] ?? ['#9CA3AF', type]
                return (
                  <div key={type} className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-[10px] text-ink-4 font-medium">{label}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Empty state */}
        {selectedTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-card border border-app-border bg-app-card"
            >
              🌤️
            </div>
            <p className="text-sm font-semibold text-ink-2 mb-1">Sin tareas</p>
            <p className="text-xs text-ink-4">
              {isToday ? 'Estás al día' : 'Nada programado este día'}
            </p>
          </div>
        )}

        {/* Timeline de tareas */}
        <TaskTimeline
          tasks={selectedTasks}
          getPlantName={getPlantName}
          onComplete={completeTask}
        />
      </div>
    </div>
  )
}
