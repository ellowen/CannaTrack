import { usePlantStore } from '@/store/plantStore'
import { useTaskStore } from '@/store/taskStore'
import { useNutritionStore } from '@/store/nutritionStore'
import { generatePlantSchedule, startFloraPhase } from '@/lib/nutrition-engine'
import { supabase } from '@/lib/auth'
import {
  syncPlantToSupabase,
  syncTasksToSupabase,
  replaceTasksForPlantInSupabase,
  updatePlantInSupabase,
  updatePlantStatusInSupabase,
} from '@/lib/sync'
import type { Plant, NutritionTable } from '@/types/plant'
import { showErrorToast } from '@/store/toastStore'
import { formatDateOnly } from '@/lib/date-utils'
import { enqueueSyncAction } from '@/lib/syncQueue'

function applyProductFilter(table: NutritionTable, available: string[]): NutritionTable {
  return {
    ...table,
    vegeWeeks: table.vegeWeeks.map((w) => ({
      ...w,
      products: w.products.filter((p) => available.includes(p.name)),
    })),
    floraWeeks: table.floraWeeks.map((w) => ({
      ...w,
      products: w.products.filter((p) => available.includes(p.name)),
    })),
  }
}

export function usePlants() {
  const { plants, addPlant: storeAdd, updatePlant, removePlant } = usePlantStore()
  const { setTasks } = useTaskStore()
  const { tables } = useNutritionStore()

  async function addPlant(data: Omit<Plant, 'id'>): Promise<Plant> {
    const plant: Plant = { ...data, id: crypto.randomUUID() }
    storeAdd(plant)

    const table = tables.find((t) => t.id === plant.nutritionTableId)
    try {
      if (table) {
        const effective = plant.availableProducts
          ? applyProductFilter(table, plant.availableProducts)
          : table
        const tasks = generatePlantSchedule(plant, effective)
        setTasks(plant.id, tasks)
        // Persistir en Supabase
        await syncPlantToSupabase(plant)
        await syncTasksToSupabase(tasks)
      } else {
        await syncPlantToSupabase(plant)
      }
    } catch (error) {
      console.error('[addPlant] Error sincronizando:', error)
      showErrorToast('La planta se guardó en este dispositivo, pero no se pudo sincronizar. Revisá tu conexión.')
      enqueueSyncAction('addPlant', { plant })
    }

    return plant
  }

  async function discardPlant(id: string) {
    updatePlant(id, { status: 'discarded', endDate: new Date() })
    try {
      await updatePlantStatusInSupabase(id, 'discarded')
    } catch (error) {
      console.error('[discardPlant] Error sincronizando:', error)
      showErrorToast('No se pudo sincronizar el descarte. Revisá tu conexión.')
      enqueueSyncAction('updatePlantStatus', { plantId: id, status: 'discarded' })
    }
  }

  async function harvestPlant(id: string) {
    updatePlant(id, { status: 'harvested', endDate: new Date() })
    try {
      await updatePlantStatusInSupabase(id, 'harvested')
    } catch (error) {
      console.error('[harvestPlant] Error sincronizando:', error)
      showErrorToast('No se pudo sincronizar la cosecha. Revisá tu conexión.')
      enqueueSyncAction('updatePlantStatus', { plantId: id, status: 'harvested' })
    }
  }

  async function reactivatePlant(id: string) {
    updatePlant(id, { status: 'active', endDate: undefined })
    try {
      await updatePlantStatusInSupabase(id, 'active')
    } catch (error) {
      console.error('[reactivatePlant] Error sincronizando:', error)
      showErrorToast('No se pudo sincronizar la reactivación. Revisá tu conexión.')
      enqueueSyncAction('updatePlantStatus', { plantId: id, status: 'active' })
    }
  }

  async function startFlora(id: string, floraStartDate: Date) {
    const plant = plants.find((p) => p.id === id)
    if (!plant) return

    const table = tables.find((t) => t.id === plant.nutritionTableId)
    if (!table) {
      updatePlant(id, { floraStartDate })
      try {
        await updatePlantInSupabase(id, { floraStartDate })
      } catch (error) {
        console.error('[startFlora] Error sincronizando:', error)
        enqueueSyncAction('updatePlantData', { plantId: id, changes: { floraStartDate } })
        throw error
      }
      return
    }

    const effective = plant.availableProducts
      ? applyProductFilter(table, plant.availableProducts)
      : table

    // Solo tareas de flora (RPC atomico en Supabase)
    const allTasks = startFloraPhase(plant, floraStartDate, effective)
    const floraTasks = allTasks.filter((t) => t.cycle === 'flora')

    // Actualizar store local primero
    updatePlant(id, { floraStartDate })
    setTasks(id, floraTasks)

    // Operacion atomica en Supabase via RPC. La identidad la resuelve
    // el propio RPC via auth.uid() -- no se envia userId como parametro
    // (ver 20260810010000_fix_start_flora_phase_auth.sql).
    const { error } = await supabase.rpc('start_flora_phase', {
      p_plant_id:         id,
      p_flora_start_date: formatDateOnly(floraStartDate),
      p_tasks: floraTasks.map((t) => ({
        type:           t.type,
        scheduled_date: t.scheduledDate instanceof Date
          ? formatDateOnly(t.scheduledDate)
          : t.scheduledDate,
        cycle:          t.cycle,
        week:           t.week,
        stage:          t.stage,
        ec_min:         t.ecMin,
        ec_max:         t.ecMax,
        ph_min:         t.phMin,
        ph_max:         t.phMax,
        products:       t.products ?? [],
      })),
    })
    if (error) {
      console.error('[startFlora] RPC error:', error)
      throw error
    }
  }

  function getPlantById(id: string): Plant | undefined {
    return plants.find((p) => p.id === id)
  }

  async function editPlant(id: string, data: Omit<Plant, 'id' | 'status'>): Promise<void> {
    const existing = plants.find((p) => p.id === id)
    if (!existing) return
    const updated: Plant = { ...existing, ...data }
    updatePlant(id, data)
    const table = tables.find((t) => t.id === updated.nutritionTableId)

    try {
      // Regenerar tareas si cambia tabla o genetica
      if (table) {
        const effective = updated.availableProducts
          ? applyProductFilter(table, updated.availableProducts)
          : table
        const tasks = generatePlantSchedule(updated, effective)
        setTasks(id, tasks)
        // Reemplazo atomico: si solo insertaramos, las tareas viejas quedan en la DB
        await replaceTasksForPlantInSupabase(id, tasks)
      }

      await updatePlantInSupabase(id, data as Record<string, unknown>)
    } catch (error) {
      console.error('[editPlant] Error sincronizando:', error)
      showErrorToast('Los cambios se guardaron en este dispositivo, pero no se pudieron sincronizar. Revisá tu conexión.')
      if (table) {
        const currentTasks = useTaskStore.getState().tasks.filter((t) => t.plantId === id)
        enqueueSyncAction('replaceTasks', { plantId: id, tasks: currentTasks })
      }
      enqueueSyncAction('updatePlantData', { plantId: id, changes: data })
    }
  }

  return {
    plants: plants.filter((p) => p.status === 'active'),
    allPlants: plants,
    addPlant,
    updatePlant,
    editPlant,
    removePlant,
    discardPlant,
    harvestPlant,
    reactivatePlant,
    startFlora,
    getPlantById,
  }
}
