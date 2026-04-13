import { useState } from 'react'
import { addDays, startOfWeek, format, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { useTasks } from '@/hooks/useTasks'
import { usePlants } from '@/hooks/usePlants'
import { WeekView, TaskItem } from '@/components/calendar'
import { Card } from '@/components/ui'
import { getTasksForDate } from '@/lib/nutrition-utils'

export default function Calendar() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(today, { weekStartsOn: 1 })
  )
  const [selectedDate, setSelectedDate] = useState(today)

  const { tasks, completeTask } = useTasks()
  const { plants } = usePlants()

  const selectedTasks = getTasksForDate(tasks, selectedDate)

  function getPlantName(plantId: string): string {
    return plants.find((p) => p.id === plantId)?.name ?? '—'
  }

  function prevWeek() {
    const prev = addDays(weekStart, -7)
    setWeekStart(prev)
    setSelectedDate(prev)
  }

  function nextWeek() {
    const next = addDays(weekStart, 7)
    setWeekStart(next)
    setSelectedDate(next)
  }

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Calendario</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={prevWeek}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 text-lg"
          >
            ‹
          </button>
          <span className="text-sm text-gray-600 w-32 text-center">
            {format(weekStart, "d MMM", { locale: es })} –{' '}
            {format(addDays(weekStart, 6), "d MMM", { locale: es })}
          </span>
          <button
            onClick={nextWeek}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 text-lg"
          >
            ›
          </button>
        </div>
      </div>

      <WeekView
        tasks={tasks}
        weekStart={weekStart}
        today={today}
        onDayClick={(date) => setSelectedDate(date)}
      />

      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-2 capitalize">
          {isSameDay(selectedDate, today)
            ? 'Hoy'
            : format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
        </h2>

        {selectedTasks.length === 0 ? (
          <Card>
            <p className="text-sm text-gray-500 text-center py-2">Sin tareas este día</p>
          </Card>
        ) : (
          <Card>
            <div className="divide-y divide-gray-100">
              {selectedTasks.map((task) => (
                <div key={task.id}>
                  <TaskItem task={task} onComplete={completeTask} />
                  <p className="text-xs text-gray-400 pb-2 pl-5">{getPlantName(task.plantId)}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
