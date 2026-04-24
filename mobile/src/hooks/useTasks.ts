import { useTaskStore } from '@/store/taskStore'
import { usePlants } from './usePlants'
import { getTasksForDate, getUpcomingTasks, getOverdueTasks } from '@shared/lib/nutrition-utils'
import type { ScheduledTask } from '@shared/types/plant'

export function useTasks(plantId?: string) {
  const { tasks, completeTask, resetTasksForPlant } = useTaskStore()
  const { plants } = usePlants()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Obtener IDs de plantas activas
  const activePlantIds = new Set(plants.filter((p) => p.status === 'active').map((p) => p.id))

  // Filtrar tareas: por planta si especificada, y solo de plantas activas
  const filteredTasks = tasks.filter((t) => {
    if (plantId && t.plantId !== plantId) return false
    return activePlantIds.has(t.plantId)
  })

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
