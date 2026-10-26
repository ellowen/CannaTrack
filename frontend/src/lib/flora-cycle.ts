import type { NutritionWeek, Plant, PlantStage } from '../types/plant'

/** Floracion por defecto (8 semanas): la que asumen las tablas nutricionales. */
export const DEFAULT_FLORA_DAYS = 56
/** Dia en que una autofloreciente entra en floracion por defecto. */
export const DEFAULT_AUTO_FLORA_START_DAY = 35
/** Semanas de floracion de la plantilla de etapas (stretch/bulking/ripening/flushing). */
const TEMPLATE_WEEKS = 8

/** Duracion de floracion de la planta en dias. Sin valor propio usa 56 (8 semanas). */
export function getFloraDays(plant: Pick<Plant, 'floraDays'>): number {
  return plant.floraDays ?? DEFAULT_FLORA_DAYS
}

/** Dia (desde la siembra) en que una autofloreciente entra en floracion. */
export function getAutoFloraStartDay(plant: Pick<Plant, 'autoFloraStartDay'>): number {
  return plant.autoFloraStartDay ?? DEFAULT_AUTO_FLORA_START_DAY
}

/** Cantidad de semanas (la ultima puede ser parcial) que ocupa una floracion de `floraDays`. */
export function floraWeekCount(floraDays: number): number {
  return Math.max(1, Math.ceil(floraDays / 7))
}

/**
 * Indice de la semana de plantilla (0-based) que le corresponde a la semana
 * `weekIndex` (0-based) de una floracion de `totalWeeks` semanas. Reparte las
 * etapas de forma proporcional: la limpieza (flushing) siempre queda al final
 * y la elongacion (stretch) al principio, sea cual sea la duracion.
 */
function templateIndex(weekIndex: number, totalWeeks: number, templateWeeks: number): number {
  return Math.min(templateWeeks - 1, Math.floor((weekIndex * templateWeeks) / totalWeeks))
}

/** Etapa de una semana de floracion (1-based) dentro de una floracion de `totalWeeks` semanas. */
export function stageForFloraWeek(weekNumber: number, totalWeeks: number): PlantStage {
  const week = templateIndex(weekNumber - 1, totalWeeks, TEMPLATE_WEEKS) + 1
  if (week <= 2) return 'stretch'
  if (week <= 4) return 'bulking'
  if (week <= 6) return 'ripening'
  return 'flushing'
}

/**
 * Adapta las semanas de floracion de una tabla a `floraDays` dias. Cada semana
 * nueva copia dosis, EC y pH de la semana de la tabla que le corresponde por
 * posicion relativa. Con la duracion de la tabla devuelve las semanas intactas.
 */
export function scaleFloraWeeks(weeks: NutritionWeek[], floraDays: number): NutritionWeek[] {
  const templateDays = weeks.length > 0 ? weeks[weeks.length - 1].dayEnd : 0
  if (weeks.length === 0 || floraDays === templateDays) return weeks

  const total = floraWeekCount(floraDays)
  return Array.from({ length: total }, (_, i) => {
    const source = weeks[templateIndex(i, total, weeks.length)]
    return {
      ...source,
      week: i + 1,
      dayStart: i * 7,
      dayEnd: Math.min((i + 1) * 7, floraDays),
    }
  })
}
