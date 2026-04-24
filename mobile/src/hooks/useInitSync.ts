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

        const plants = await loadPlantsFromSupabase(currentUser.id)
        setPlants(plants)

        const tasks = await loadTasksFromSupabase(currentUser.id)
        setAllTasks(tasks)
      } catch (error) {
        console.error('Error en sincronización inicial:', error)
      }
    }

    sync()
  }, [user, setPlants, setAllTasks])
}
