import { usePlantStore } from '@/store/plantStore'
import { useTaskStore } from '@/store/taskStore'
import { useNutritionStore } from '@/store/nutritionStore'
import { generatePlantSchedule } from '@/lib/nutrition-engine'
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

  function addPlant(data: Omit<Plant, 'id'>): Plant {
    const plant: Plant = { ...data, id: crypto.randomUUID() }
    storeAdd(plant)
    const table = tables.find((t) => t.id === plant.nutritionTableId)
    if (table) {
      const effective = plant.availableProducts
        ? applyProductFilter(table, plant.availableProducts)
        : table
      setTasks(plant.id, generatePlantSchedule(plant, effective))
    }
    return plant
  }

  function discardPlant(id: string) {
    updatePlant(id, { status: 'discarded', endDate: new Date() })
  }

  function harvestPlant(id: string) {
    updatePlant(id, { status: 'harvested', endDate: new Date() })
  }

  function startFlora(id: string, floraStartDate: Date) {
    const plant = plants.find((p) => p.id === id)
    if (!plant) return
    updatePlant(id, { floraStartDate })
    const table = tables.find((t) => t.id === plant.nutritionTableId)
    if (table) {
      const effective = plant.availableProducts
        ? applyProductFilter(table, plant.availableProducts)
        : table
      setTasks(id, generatePlantSchedule({ ...plant, floraStartDate }, effective))
    }
  }

  function getPlantById(id: string): Plant | undefined {
    return plants.find((p) => p.id === id)
  }

  /** Edita los datos de una planta y regenera el calendario nutricional. */
  function editPlant(id: string, data: Omit<Plant, 'id' | 'status'>): void {
    const existing = plants.find((p) => p.id === id)
    if (!existing) return
    const updated: Plant = { ...existing, ...data }
    updatePlant(id, data)
    const table = tables.find((t) => t.id === updated.nutritionTableId)
    if (table) {
      const effective = updated.availableProducts
        ? applyProductFilter(table, updated.availableProducts)
        : table
      setTasks(id, generatePlantSchedule(updated, effective))
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
    startFlora,
    getPlantById,
  }
}
