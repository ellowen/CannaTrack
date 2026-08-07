import { useTaskStore } from '@/store/taskStore'
import { usePlants } from './usePlants'
import { getTasksForDate, getUpcomingTasks, getOverdueTasks } from '@/lib/nutrition-utils'
import type { ScheduledTask } from '@/types/plant'

export function useTasks(plantId?: string) {
  // completeTask/uncompleteTask son SOLO locales (store) — el caller es
  // responsable de sincronizar con Supabase via completeTaskInSupabase()
  // el mismo patron que ya usan PlantDetail.tsx y Calendar.tsx. Antes esta
  // funcion TAMBIEN llamaba a completeTaskInSupabase internamente, y
  // Home.tsx la llamaba a traves de este hook Y otra vez directo — dos
  // llamadas en paralelo sin esperar una a la otra podian otorgar XP dos
  // veces por la misma tarea (race condition, ver auditoria).
  const { tasks, completeTask, uncompleteTask, resetTasksForPlant } = useTaskStore()
  const { plants } = usePlants()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const activePlantIds = new Set(plants.filter((p) => p.status === 'active').map((p) => p.id))

  const filteredTasks = tasks.filter((t) => {
    if (plantId && t.plantId !== plantId) return false
    return activePlantIds.has(t.plantId)
  })

  // Solo mostrar tareas del ciclo activo de cada planta
  const activeCycleTasks = filteredTasks.filter((t) => {
    const plant = plants.find((p) => p.id === t.plantId)
    if (!plant) return true
    const currentCycle = plant.floraStartDate ? 'flora' : 'vege'
    return t.cycle === currentCycle
  })

  const todayTasks = getTasksForDate(activeCycleTasks, today)
  const upcomingTasks = getUpcomingTasks(activeCycleTasks, today, 7)
  const overdueTasks = getOverdueTasks(activeCycleTasks, today)

  function getTasksForPlant(pId: string): ScheduledTask[] {
    return activeCycleTasks.filter((t) => t.plantId === pId)
  }

  return {
    tasks: activeCycleTasks,
    todayTasks,
    upcomingTasks,
    overdueTasks,
    completeTask,
    uncompleteTask,
    resetTasksForPlant,
    getTasksForPlant,
  }
}
