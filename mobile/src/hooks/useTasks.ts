import { useTaskStore } from '@/store/taskStore'
import { usePlants } from './usePlants'
import { getTasksForDate, getUpcomingTasks, getOverdueTasks } from '@shared/lib/nutrition-utils'
import type { ScheduledTask } from '@shared/types/plant'
import { useMemo } from 'react'

export function useTasks(plantId?: string) {
  const { tasks, completeTask, resetTasksForPlant } = useTaskStore()
  const { plants } = usePlants()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Memoize todayStr to avoid creating new string on every call
  const todayStr = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }, [])

  // Obtener IDs de plantas activas
  const activePlantIds = useMemo(() =>
    new Set(plants.filter((p) => p.status === 'active').map((p) => p.id)),
    [plants]
  )

  // Filtrar tareas: por planta si especificada, y solo de plantas activas
  const filteredTasks = useMemo(() =>
    tasks.filter((t) => {
      if (plantId && t.plantId !== plantId) return false
      return activePlantIds.has(t.plantId)
    }),
    [tasks, plantId, activePlantIds]
  )

  const todayTasks = getTasksForDate(filteredTasks, today)
  const upcomingTasks = getUpcomingTasks(filteredTasks, today, 7)
  const overdueTasks = getOverdueTasks(filteredTasks, today)

  function getTasksForPlant(pId: string): ScheduledTask[] {
    return tasks.filter((t) => t.plantId === pId && activePlantIds.has(pId))
  }

  return {
    tasks: filteredTasks,
    todayTasks,
    upcomingTasks,
    overdueTasks,
    completeTask,
    resetTasksForPlant,
    getTasksForPlant,
  }
}
