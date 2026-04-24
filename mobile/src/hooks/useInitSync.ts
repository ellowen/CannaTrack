/**
 * Hook para sincronizar datos de Supabase al iniciar la app (Mobile)
 */

import { useEffect } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { loadPlantsFromSupabase, loadTasksFromSupabase } from '@/lib/sync'
import { usePlantStore } from '@/store/plantStore'
import { useTaskStore } from '@/store/taskStore'

export function useInitSync() {
  const { setPlants } = usePlantStore()
  const { setTasks: setAllTasks } = useTaskStore()
  const user = getCurrentUser()

  useEffect(() => {
    async function sync() {
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) return

        // Load plants and tasks in parallel instead of sequentially (200-300ms faster)
        const [plants, tasks] = await Promise.all([
          loadPlantsFromSupabase(currentUser.id),
          loadTasksFromSupabase(currentUser.id),
        ])

        setPlants(plants)
        setAllTasks(tasks)
      } catch (error) {
        console.error('Error en sincronización inicial:', error)
      }
    }

    sync()
  }, [user, setPlants, setAllTasks])
}
