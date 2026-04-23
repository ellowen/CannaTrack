import { useTaskStore } from '@/store/taskStore'
import { getTasksForDate, getUpcomingTasks, getOverdueTasks } from '@shared/lib/nutrition-utils'
import type { ScheduledTask } from '@shared/types/plant'

export function useTasks(plantId?: string) {
  const { tasks, completeTask, resetTasksForPlant } = useTaskStore()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const filteredTasks = plantId ? tasks.filter((t) => t.plantId === plantId) : tasks

  const todayTasks = getTasksForDate(filteredTasks, today)
  const upcomingTasks = getUpcomingTasks(filteredTasks, today, 7)
  const overdueTasks = getOverdueTasks(filteredTasks, today)

  function getTasksForPlant(pId: string): ScheduledTask[] {
    return tasks.filter((t) => t.plantId === pId)
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
