/**
 * Hook para sincronizar datos de Supabase al iniciar la app (Mobile)
 */

import { useEffect } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { loadPlantsFromSupabase, loadTasksFromSupabase } from '@/lib/sync'
import { usePlantStore } from '@/store/plantStore'
import { useTaskStore } from '@/store/taskStore'
import { supabase } from '@/lib/supabase'
import { schedulePlantTaskNotification } from '@/lib/notifications'
import type { Plant } from '@shared/types/plant'

export function useInitSync() {
  const setPlants = usePlantStore(s => s.setPlants)
  const setAllTasks = useTaskStore(s => s.setAllTasks)

  useEffect(() => {
    async function sync() {
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) return

        const [plants, tasks, { data: prof }] = await Promise.all([
          loadPlantsFromSupabase(currentUser.id),
          loadTasksFromSupabase(currentUser.id),
          supabase.from('profiles').select('notifications_enabled').eq('id', currentUser.id).maybeSingle(),
        ])

        setPlants(plants)
        setAllTasks(tasks)

        // Programar notificaciones para tareas pendientes de los proximos 7 dias
        if (prof?.notifications_enabled) {
          const now = new Date()
          const horizon = new Date(now)
          horizon.setDate(horizon.getDate() + 7)

          const plantMap = new Map<string, Plant>(plants.map((p: Plant) => [p.id, p]))

          for (const task of tasks) {
            if (task.completed) continue
            const d = task.scheduledDate instanceof Date ? task.scheduledDate : new Date(task.scheduledDate)
            if (d <= now || d > horizon) continue
            const plant = plantMap.get(task.plantId)
            if (!plant) continue
            void schedulePlantTaskNotification(task.plantId, plant.name, task.type, d)
          }
        }
      } catch (error: unknown) {
        // AuthSessionMissingError es esperado cuando el usuario no está logueado
        if (error instanceof Error && error.name === 'AuthSessionMissingError') return
        console.error('Error en sincronización inicial:', error)
      }
    }

    sync()
  // setPlants y setAllTasks son referencias estables de Zustand
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
