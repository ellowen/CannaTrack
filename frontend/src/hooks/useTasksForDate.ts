import { useMemo } from 'react'
import { useTaskStore } from '@/store/taskStore'
import { getTasksForDate } from '@/lib/nutrition-utils'
import type { ScheduledTask } from '@/types/plant'

export interface TasksByType {
  nutrition: ScheduledTask[]
  irrigation: ScheduledTask[]
  foliar: ScheduledTask[]
  observation: ScheduledTask[]
  harvest: ScheduledTask[]
}

export interface TasksForDateData {
  tasks: ScheduledTask[]
  completed: ScheduledTask[]
  pending: ScheduledTask[]
  byType: TasksByType
}

/**
 * Hook que filtra las tareas de un día específico desde taskStore.
 * Agrupa por tipo de tarea y separa completadas de pendientes.
 * Si date es null, usa la fecha de hoy.
 * Memoizado para evitar recálculos.
 */
export function useTasksForDate(date: Date | null = null): TasksForDateData {
  const { tasks } = useTaskStore((state) => ({
    tasks: state.tasks,
  }))

  return useMemo(() => {
    const targetDate = date ?? new Date()
    targetDate.setHours(0, 0, 0, 0)

    // Filtrar tareas del día
    const dayTasks = getTasksForDate(tasks, targetDate)

    // Separar completadas y pendientes
    const completed = dayTasks.filter((t) => t.completed)
    const pending = dayTasks.filter((t) => !t.completed)

    // Agrupar por tipo
    const byType: TasksByType = {
      nutrition: dayTasks.filter((t) => t.type === 'nutrition'),
      irrigation: dayTasks.filter((t) => t.type === 'irrigation'),
      foliar: dayTasks.filter((t) => t.type === 'foliar'),
      observation: dayTasks.filter((t) => t.type === 'observation'),
      harvest: dayTasks.filter((t) => t.type === 'harvest'),
    }

    return {
      tasks: dayTasks,
      completed,
      pending,
      byType,
    }
  }, [tasks, date])
}
