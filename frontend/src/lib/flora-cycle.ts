import { addDays, differenceInDays, startOfDay } from 'date-fns'
import type { CyclePhase, NutritionWeek, Plant, PlantStage } from '../types/plant'

/** Floracion por defecto (8 semanas): la que asumen las tablas nutricionales. */
export const DEFAULT_FLORA_DAYS = 56
/** Dia en que una autofloreciente entra en floracion por defecto. */
export const DEFAULT_AUTO_FLORA_START_DAY = 35
/** Vegetativo por defecto (6 semanas): el de las tablas nutricionales. */
export const DEFAULT_VEGE_DAYS = 42
/** Semanas de vegetativo de la plantilla (rooting/growth/preflower). */
const VEGE_TEMPLATE_WEEKS = 6
/** Semanas de floracion de la plantilla de etapas (stretch/bulking/ripening/flushing). */
const TEMPLATE_WEEKS = 8

/** Duracion de floracion de la planta en dias. Sin valor propio usa 56 (8 semanas). */
export function getFloraDays(plant: Pick<Plant, 'floraDays'>): number {
  return plant.floraDays ?? DEFAULT_FLORA_DAYS
}

/** Duracion del vegetativo de la planta en dias. Sin valor propio usa 42 (6 semanas). */
export function getVegeDays(plant: Pick<Plant, 'vegeDays'>): number {
  return plant.vegeDays ?? DEFAULT_VEGE_DAYS
}

/** Dia (desde la siembra) en que una autofloreciente entra en floracion. */
export function getAutoFloraStartDay(plant: Pick<Plant, 'autoFloraStartDay'>): number {
  return plant.autoFloraStartDay ?? DEFAULT_AUTO_FLORA_START_DAY
}

/** Cantidad de semanas (la ultima puede ser parcial) que ocupa una floracion de `floraDays`. */
export function floraWeekCount(floraDays: number): number {
  return Math.max(1, Math.ceil(floraDays / 7))
}

/** Cantidad de semanas (la ultima puede ser parcial) que ocupa un vegetativo de `vegeDays`. */
export function vegeWeekCount(vegeDays: number): number {
  return Math.max(1, Math.ceil(vegeDays / 7))
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

/** Etapa de una semana de vegetativo (0-based, V0..) dentro de un vegetativo de `totalWeeks` semanas. */
export function stageForVegeWeek(weekIndex: number, totalWeeks: number): PlantStage {
  const week = templateIndex(weekIndex, totalWeeks, VEGE_TEMPLATE_WEEKS)
  if (week < 2) return 'rooting'
  if (week < 4) return 'growth'
  return 'preflower'
}

/**
 * Adapta las semanas de VEGETATIVO de una tabla a `vegeDays` dias (mismo reparto
 * proporcional que la floracion). Las semanas del vegetativo se numeran desde 0.
 */
export function scaleVegeWeeks(weeks: NutritionWeek[], vegeDays: number): NutritionWeek[] {
  const templateDays = weeks.length > 0 ? weeks[weeks.length - 1].dayEnd : 0
  if (weeks.length === 0 || vegeDays === templateDays) return weeks

  const total = vegeWeekCount(vegeDays)
  return Array.from({ length: total }, (_, i) => {
    const source = weeks[templateIndex(i, total, weeks.length)]
    return {
      ...source,
      week: i,
      dayStart: i * 7,
      dayEnd: Math.min((i + 1) * 7, vegeDays),
    }
  })
}

/**
 * Dias de la semana (0 = dia de la nutricion) en que se riega. Sin configuracion
 * propia se mantiene el patron historico: 2 riegos (dias 2 y 4), y 3 (0, 2 y 4) en
 * las semanas de limpieza, que son solo agua.
 */
const IRRIGATION_OFFSETS: Record<number, number[]> = {
  1: [3],
  2: [2, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 5, 6],
  6: [1, 2, 3, 4, 5, 6],
  7: [0, 1, 2, 3, 4, 5, 6],
}

export function irrigationOffsets(perWeek: number | undefined, flushing: boolean): number[] {
  if (perWeek == null) return flushing ? [0, 2, 4] : [2, 4]
  return IRRIGATION_OFFSETS[Math.min(7, Math.max(1, Math.round(perWeek)))]
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

/**
 * Fecha en que la planta entra en floracion. Las fotoperiodicas la registran a
 * mano (floraStartDate); las autoflorecientes NO tienen floraStartDate: florecen
 * solas a los autoFloraStartDay dias (35 por defecto) de la siembra.
 */
export function getFloraStart(
  plant: Pick<Plant, 'floraStartDate' | 'geneticType' | 'startDate' | 'autoFloraStartDay'>,
): Date | undefined {
  if (plant.floraStartDate) return plant.floraStartDate
  if (plant.geneticType === 'autoflower') return addDays(plant.startDate, getAutoFloraStartDay(plant))
  return undefined
}

/** Ciclo en el que esta la planta en una fecha dada ('flora' o 'vege'). */
export function getActiveCycle(
  plant: Pick<Plant, 'floraStartDate' | 'geneticType' | 'startDate' | 'autoFloraStartDay'>,
  date: Date,
): CyclePhase {
  if (plant.floraStartDate) return 'flora'
  const start = getFloraStart(plant)
  return start && date >= start ? 'flora' : 'vege'
}

/**
 * Dias que faltan para la siembra (0 si ya se sembro). Compara por dia de
 * calendario, no por horas: una siembra de hoy nunca esta "por venir".
 */
export function daysUntilSowing(plant: Pick<Plant, 'startDate'>, today: Date = new Date()): number {
  return Math.max(0, differenceInDays(startOfDay(plant.startDate), startOfDay(today)))
}

/** Siembra planificada: planta activa cuya fecha de inicio todavia no llego. */
export function isPlanned(plant: Pick<Plant, 'startDate' | 'status'>, today: Date = new Date()): boolean {
  return plant.status === 'active' && daysUntilSowing(plant, today) > 0
}
