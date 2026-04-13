import { usePlantStore } from '@/store/plantStore'
import { useTaskStore } from '@/store/taskStore'
import { useNutritionStore } from '@/store/nutritionStore'
import { generatePlantSchedule } from '@/lib/nutrition-engine'
import type { Plant } from '@/types/plant'

export function usePlants() {
  const { plants, addPlant: storeAdd, updatePlant, removePlant } = usePlantStore()
  const { setTasks } = useTaskStore()
  const { tables } = useNutritionStore()

  function addPlant(data: Omit<Plant, 'id'>): Plant {
    const plant: Plant = { ...data, id: crypto.randomUUID() }
    storeAdd(plant)
    const table = tables.find((t) => t.id === plant.nutritionTableId)
    if (table) {
      setTasks(plant.id, generatePlantSchedule(plant, table))
    }
    return plant
  }

  function discardPlant(id: string) {
    updatePlant(id, { status: 'discarded' })
  }

  function harvestPlant(id: string) {
    updatePlant(id, { status: 'harvested' })
  }

  function startFlora(id: string, floraStartDate: Date) {
    const plant = plants.find((p) => p.id === id)
    if (!plant) return
    updatePlant(id, { floraStartDate })
    const table = tables.find((t) => t.id === plant.nutritionTableId)
    if (table) {
      setTasks(id, generatePlantSchedule({ ...plant, floraStartDate }, table))
    }
  }

  function getPlantById(id: string): Plant | undefined {
    return plants.find((p) => p.id === id)
  }

  return {
    plants: plants.filter((p) => p.status === 'active'),
    allPlants: plants,
    addPlant,
    updatePlant,
    removePlant,
    discardPlant,
    harvestPlant,
    startFlora,
    getPlantById,
  }
}
