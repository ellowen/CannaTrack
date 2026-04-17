import { useState } from 'react'
import { Link } from 'react-router-dom'
import { addMonths, format, isSameDay, isSameMonth, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { useTasks } from '@/hooks/useTasks'
import { usePlants } from '@/hooks/usePlants'
import { useTaskStore } from '@/store/taskStore'
import { MonthCalendar, TaskTimeline } from '@/components/calendar'
import { CompleteTaskSheet } from '@/components/tasks'
import { getTasksForDate } from '@/lib/nutrition-utils'
import { hapticLight } from '@/lib/haptics'
import type { ScheduledTask } from '@/types/plant'

const TYPE_COLOR: Record<string, string> = {
  nutrition:   '#22C55E',
  irrigation:  '#3B82F6',
  observation: '#F59E0B',
  foliar:      '#A855F7',
  harvest:     '#EF4444',
}

const TYPE_LABEL: Record<string, string> = {
  nutrition: 'Nutricion', irrigation: 'Riego',
  observation: 'Obs.', foliar: 'Foliar', harvest: 'Cosecha',
}

export default function Calendar() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [month, setMonth]       = useState(() => startOfMonth(today))
  const [selected, setSelected] = useState(today)
  const [animDir, setAnimDir]   = useState<'left' | 'right' | null>(null)
  const [completingTask, setCompletingTask] = useState<ScheduledTask | null>(null)

  const { tasks } = useTasks()
  const { completeTask } = useTaskStore()
  const { plants } = usePlants()

  const selectedTasks = getTasksForDate(tasks, selected)
  const pending = selectedTasks.filter((t) => !t.completed)
  const isThisMonth = isSameMonth(month, today)
  const isToday = isSameDay(selected, today)

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

  if (plants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-8 text-center">
        <div className="text-6xl mb-5 select-none">📅</div>
        <h2 className="text-xl font-black text-ink-1 mb-2">Sin calendario aún</h2>
        <p className="text-sm text-ink-3 mb-8 max-w-[260px] leading-relaxed">
          Agregá tu primera planta y generamos el calendario nutricional automáticamente.
        </p>
        <Link
          to="/plants/new"
          className="inline-flex items-center gap-2 bg-brand-400 text-white font-bold px-6 py-3.5 rounded-2xl shadow-glow-brand tap-highlight-none active:scale-[0.97] transition-all"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          Agregar planta
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-dvh">

      {/* ── Calendario (altura fija, no scrollea) ── */}
      <div className="flex-shrink-0 px-4 pt-8 pb-3">
        <div className="bg-app-card rounded-3xl shadow-card border border-app-border overflow-hidden">

          {/* Header */}
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-ink-4 uppercase tracking-[0.15em] mb-0.5">Calendario</p>
              <h1 className="text-xl font-black text-ink-1 capitalize leading-none">
                {format(month, 'MMMM', { locale: es })}
                <span className="text-ink-3 font-semibold ml-2 text-base">
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
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-app-elevated border border-app-border text-ink-2 tap-highlight-none active:scale-90 transition-all"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                onClick={() => navigate(1)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-app-elevated border border-app-border text-ink-2 tap-highlight-none active:scale-90 transition-all"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          {/* Grilla mensual */}
          <div className="px-3 pb-4">
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
      </div>

      {/* ── Tareas: area con scroll propio, nunca toca el calendario ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">

        {/* Header del dia */}
        <div className="flex items-center justify-between mb-4 px-1 pt-1">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 rounded-full bg-brand-400" />
            <div>
              <h2 className="text-sm font-black text-ink-1 capitalize leading-none">
                {isToday ? '⚡ Hoy' : format(selected, "EEEE d 'de' MMMM", { locale: es })}
              </h2>
              <p className="text-[11px] mt-0.5 font-medium">
                {pending.length > 0
                  ? <span className="text-ink-3">{pending.length} pendiente{pending.length > 1 ? 's' : ''}</span>
                  : selectedTasks.length > 0
                  ? <span className="text-brand-400">✓ Todo completado</span>
                  : <span className="text-ink-4">Sin tareas</span>
                }
              </p>
            </div>
          </div>
          {selectedTasks.length > 0 && (
            <div className="flex flex-wrap gap-x-2.5 gap-y-1 justify-end max-w-[150px]">
              {[...new Set(selectedTasks.map((t) => t.type))].map((type) => (
                <div key={type} className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: TYPE_COLOR[type] ?? '#9CA3AF' }} />
                  <span className="text-[10px] text-ink-4 font-medium">{TYPE_LABEL[type] ?? type}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Empty state */}
        {selectedTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center bg-app-card rounded-3xl border border-app-border">
            <div className="text-2xl mb-2">🌤️</div>
            <p className="text-sm font-semibold text-ink-2">Sin tareas</p>
            <p className="text-xs text-ink-4 mt-0.5">
              {isToday ? 'Estas al dia' : 'Nada programado este dia'}
            </p>
          </div>
        )}

        <TaskTimeline
          tasks={selectedTasks}
          getPlantName={getPlantName}
          onComplete={(id) => {
            hapticLight()
            setCompletingTask(selectedTasks.find((t) => t.id === id) ?? null)
          }}
        />
      </div>

      <CompleteTaskSheet
        task={completingTask}
        onConfirm={(taskId, notes) => completeTask(taskId, notes)}
        onClose={() => setCompletingTask(null)}
      />
    </div>
  )
}
