/**
 * Hook para sincronizar datos de Supabase al iniciar la app
 */

import { useEffect } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { loadPlantsFromSupabase, loadTasksFromSupabase } from '@/lib/sync'
import { usePlantStore } from '@/store/plantStore'
import { useTaskStore } from '@/store/taskStore'

export function useInitSync() {
  const { setPlants } = usePlantStore()
  const { setTasks: setAllTasks } = useTaskStore()

  useEffect(() => {
    async function sync() {
      try {
        const user = await getCurrentUser()
        if (!user) return

        // Cargar plantas de Supabase
        const plants = await loadPlantsFromSupabase(user.id)
        setPlants(plants)

        // Cargar tareas de Supabase
        const tasks = await loadTasksFromSupabase(user.id)

        // Agrupar tareas por planta (el store las guarda todas)
        // En realidad, el store guarda todas las tareas juntas
        useTaskStore.setState({ tasks })
      } catch (error) {
        console.error('Error en sincronización inicial:', error)
        // No lanzar error, solo usar lo que está en localStorage
      }
    }

    sync()
  }, [])
}
