import { differenceInDays } from 'date-fns'
import { STRAIN_PRESETS } from '../data/strain-presets'
import type { Plant } from '../types/plant'

export const MAX_HARVEST_WEIGHT_G = 10000

/** Peso valido en gramos: numero positivo hasta 10 kg. */
export function isValidHarvestWeight(grams: number): boolean {
  return Number.isFinite(grams) && grams > 0 && grams <= MAX_HARVEST_WEIGHT_G
}

/** Rendimiento por planta que declara la ficha del catalogo para esta planta, si lo hay. */
export function sheetYieldFor(plant: Pick<Plant, 'genetics'>): { min: number; max: number } | null {
  return STRAIN_PRESETS.find((p) => p.genetics === plant.genetics)?.yieldGPerPlant ?? null
}

/** Donde cae el peso respecto del rango de la ficha. */
export function compareToSheet(grams: number, range: { min: number; max: number }): 'below' | 'within' | 'above' {
  if (grams < range.min) return 'below'
  if (grams > range.max) return 'above'
  return 'within'
}

/**
 * Metricas derivadas del peso cosechado: gramos por dia de cultivo (siembra ->
 * cierre) y por litro de maceta. Null sin peso o sin fecha de cierre.
 */
export function harvestStats(
  plant: Pick<Plant, 'harvestWeightG' | 'startDate' | 'endDate' | 'potCount' | 'potVolumeLiters'>,
): { gramsPerDay: number | null; gramsPerLiter: number | null } | null {
  const g = plant.harvestWeightG
  if (g == null) return null
  const days = plant.endDate ? differenceInDays(plant.endDate, plant.startDate) : 0
  const liters = (plant.potVolumeLiters ?? 0) * plant.potCount
  return {
    gramsPerDay: days > 0 ? g / days : null,
    gramsPerLiter: liters > 0 ? g / liters : null,
  }
}
