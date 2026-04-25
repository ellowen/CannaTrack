import { useMemo } from 'react'
import { differenceInDays } from 'date-fns'
import type { Plant, NutritionTable, ScheduledTask } from '@/types/plant'
import { generatePlantSchedule } from '@/lib/nutrition-engine'
import { getCurrentWeek, getEstimatedHarvestDate } from '@/lib/nutrition-utils'

export interface PlantScheduleData {
  currentWeek: { cycle: 'vege' | 'flora'; week: number; stage: string } | null
  currentStage: string
  daysIntoStage: number
  progressPercentage: number
  nextCriticalDate: Date | null
  tasks: ScheduledTask[]
}

/**
 * Hook que integra una planta con su tabla nutricional.
 * Genera el cronograma de tareas, calcula la etapa actual y el progreso.
 * Memoizado para evitar recálculos innecesarios.
 */
export function usePlantSchedule(
  plant: Plant,
  nutritionTable: NutritionTable,
): PlantScheduleData {
  return useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Generar todas las tareas del cronograma
    const tasks = generatePlantSchedule(plant, nutritionTable)

    // Obtener semana y etapa actuales
    const currentWeek = getCurrentWeek(plant, today)
    const currentStage = currentWeek?.stage ?? 'harvested'

    // Calcular días en la etapa actual
    let daysIntoStage = 0
    if (currentWeek) {
      const cycleStart =
        currentWeek.cycle === 'flora' && plant.floraStartDate
          ? plant.floraStartDate
          : plant.startDate

      if (currentWeek.cycle === 'flora' && plant.geneticType === 'autoflower') {
        // Para autofloreciente, el inicio de flora es automático
        const floraBase = new Date(plant.startDate)
        floraBase.setDate(floraBase.getDate() + 35)
        daysIntoStage = differenceInDays(today, floraBase)
      } else {
        daysIntoStage = differenceInDays(today, cycleStart)
      }
    }

    // Calcular progreso como porcentaje (0–100)
    const progressPercentage = Math.min(
      Math.round((daysIntoStage / 7) * (100 / 6)),
      100,
    )

    // Obtener fecha estimada de cosecha como próxima fecha crítica
    const nextCriticalDate = getEstimatedHarvestDate(plant)

    return {
      currentWeek,
      currentStage,
      daysIntoStage,
      progressPercentage,
      nextCriticalDate,
      tasks,
    }
  }, [plant, nutritionTable])
}
