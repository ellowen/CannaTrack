import { usePlantStore } from '@/store/plantStore'
import { useTaskStore } from '@/store/taskStore'
import { useNutritionStore } from '@/store/nutritionStore'
import { generatePlantSchedule, startFloraPhase } from '@/lib/nutrition-engine'
import { supabase } from '@/lib/auth'
import {
  syncPlantToSupabase,
  syncTasksToSupabase,
  updatePlantInSupabase,
  updatePlantStatusInSupabase,
} from '@/lib/sync'
import type { Plant, NutritionTable } from '@/types/plant'

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
    if (table) {
      const effective = plant.availableProducts
        ? applyProductFilter(table, plant.availableProducts)
        : table
      const tasks = generatePlantSchedule(plant, effective)
      setTasks(plant.id, tasks)
      // Persistir en Supabase
      void syncPlantToSupabase(plant)
      void syncTasksToSupabase(tasks)
    } else {
      void syncPlantToSupabase(plant)
    }

    return plant
  }

  async function discardPlant(id: string) {
    updatePlant(id, { status: 'discarded', endDate: new Date() })
    void updatePlantStatusInSupabase(id, 'discarded')
  }

  async function harvestPlant(id: string) {
    updatePlant(id, { status: 'harvested', endDate: new Date() })
    void updatePlantStatusInSupabase(id, 'harvested')
  }

  async function reactivatePlant(id: string) {
    updatePlant(id, { status: 'active', endDate: undefined })
    void updatePlantStatusInSupabase(id, 'active')
  }

  async function startFlora(id: string, floraStartDate: Date) {
    const plant = plants.find((p) => p.id === id)
    if (!plant) return

    const table = tables.find((t) => t.id === plant.nutritionTableId)
    if (!table) {
      updatePlant(id, { floraStartDate })
      void updatePlantInSupabase(id, { floraStartDate })
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

    // Operacion atomica en Supabase via RPC
    const { data: authData } = await supabase.auth.getUser()
    const userId = authData.user?.id
    if (userId) {
      const { error } = await supabase.rpc('start_flora_phase', {
        p_plant_id:         id,
        p_user_id:          userId,
        p_flora_start_date: floraStartDate.toISOString().split('T')[0],
        p_tasks: floraTasks.map((t) => ({
          type:           t.type,
          scheduled_date: t.scheduledDate instanceof Date
            ? t.scheduledDate.toISOString().split('T')[0]
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
      if (error) console.error('[startFlora] RPC error:', error)
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

    // Regenerar tareas si cambia tabla o genetica
    const table = tables.find((t) => t.id === updated.nutritionTableId)
    if (table) {
      const effective = updated.availableProducts
        ? applyProductFilter(table, updated.availableProducts)
        : table
      const tasks = generatePlantSchedule(updated, effective)
      setTasks(id, tasks)
      void syncTasksToSupabase(tasks)
    }

    void updatePlantInSupabase(id, data as Record<string, unknown>)
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
