/**
 * Hook para sincronizar datos de Supabase al iniciar la app (Mobile)
 */

import { useEffect } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { loadPlantsFromSupabase, loadTasksFromSupabase } from '@/lib/sync'
import { usePlantStore } from '@/store/plantStore'
import { useTaskStore } from '@/store/taskStore'

export function useInitSync() {
  const setPlants = usePlantStore(s => s.setPlants)
  const setAllTasks = useTaskStore(s => s.setAllTasks)

  useEffect(() => {
    async function sync() {
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) return

        const [plants, tasks] = await Promise.all([
          loadPlantsFromSupabase(currentUser.id),
          loadTasksFromSupabase(currentUser.id),
        ])

        setPlants(plants)
        setAllTasks(tasks)
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
