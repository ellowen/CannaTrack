import { addDays, differenceInDays } from 'date-fns'
import type {
  Plant,
  ScheduledTask,
  CyclePhase,
  PlantStage,
  NutritionTable,
  ProductDose,
  AccessTier,
} from '../types/plant'

// ─── Helpers internos ─────────────────────────────────────────────────────────

/** Compara dos fechas ignorando hora/minuto/segundo */
function mismodia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** Días entre dos fechas (resultado entero, puede ser negativo) */
function diasEntre(desde: Date, hasta: Date): number {
  const MS_DIA = 1000 * 60 * 60 * 24
  return Math.floor((hasta.getTime() - desde.getTime()) / MS_DIA)
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Devuelve las tareas de un día específico.
 * Compara sólo año/mes/día, sin tener en cuenta la hora.
 */
export function getTasksForDate(
  tasks: ScheduledTask[],
  date: Date,
): ScheduledTask[] {
  return tasks.filter(t => mismodia(t.scheduledDate, date))
}

/**
 * Devuelve las próximas N tareas desde una fecha, ordenadas por fecha.
 * Solo incluye tareas no completadas cuya fecha es >= fromDate.
 */
export function getUpcomingTasks(
  tasks: ScheduledTask[],
  fromDate: Date,
  count: number,
): ScheduledTask[] {
  const desde = fromDate.getTime()
  return tasks
    .filter(t => !t.completed && t.scheduledDate.getTime() >= desde)
    .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime())
    .slice(0, count)
}

/**
 * Devuelve la semana y etapa actual de la planta en una fecha dada.
 * Retorna null si la planta ya fue cosechada o el ciclo finalizó.
 */
export function getCurrentWeek(
  plant: Plant,
  date: Date,
): { cycle: CyclePhase; week: number; stage: PlantStage } | null {
  // Si estamos en floración
  if (plant.floraStartDate && date >= plant.floraStartDate) {
    const diasFlora = diasEntre(plant.floraStartDate, date)
    const numSemana = Math.floor(diasFlora / 7) + 1

    if (numSemana <= 2) return { cycle: 'flora', week: numSemana, stage: 'stretch' }
    if (numSemana <= 4) return { cycle: 'flora', week: numSemana, stage: 'bulking' }
    if (numSemana <= 6) return { cycle: 'flora', week: numSemana, stage: 'ripening' }
    if (numSemana <= 8) return { cycle: 'flora', week: numSemana, stage: 'flushing' }
    return null
  }

  // Autofloreciente: calcular floración automática
  if (plant.geneticType === 'autoflower') {
    const floraAuto = addDays(plant.startDate, 35)
    if (date >= floraAuto) {
      const diasFlora = diasEntre(floraAuto, date)
      const numSemana = Math.floor(diasFlora / 7) + 1
      if (numSemana <= 8) {
        const stage: PlantStage =
          numSemana <= 2 ? 'stretch' :
          numSemana <= 4 ? 'bulking' :
          numSemana <= 6 ? 'ripening' : 'flushing'
        return { cycle: 'flora', week: numSemana, stage }
      }
      return null
    }
  }

  // Ciclo vegetativo
  const diasVege = diasEntre(plant.startDate, date)
  const numSemana = Math.floor(diasVege / 7)

  if (numSemana < 2) return { cycle: 'vege', week: numSemana, stage: 'rooting' }
  if (numSemana < 4) return { cycle: 'vege', week: numSemana, stage: 'growth' }
  if (numSemana < 6) return { cycle: 'vege', week: numSemana, stage: 'preflower' }

  return null
}

/**
 * Fecha estimada de cosecha según el tipo de genética y las fechas de inicio.
 * Retorna null si no hay suficiente información para calcularla.
 */
export function getEstimatedHarvestDate(plant: Plant): Date | null {
  if (plant.geneticType === 'autoflower') {
    // Autofloreciente: días totales configurables (default 75)
    return addDays(plant.startDate, plant.autoFlowerTotalDays ?? 75)
  }

  if (plant.floraStartDate) {
    // Feminizada/regular con floración iniciada: 8 semanas de flora (56 días)
    return addDays(plant.floraStartDate, 56)
  }

  // Sin floraStartDate no se puede calcular aún
  return null
}

/**
 * Rango EC y PH de referencia para una fecha dada, según la tabla nutricional.
 * Retorna null si la fecha cae fuera de todas las semanas definidas.
 */
export function getRangesForDate(
  plant: Plant,
  table: NutritionTable,
  date: Date,
): { ecMin: number; ecMax: number; phMin: number; phMax: number } | null {
  // Evaluar semanas de floración primero
  const floraBase =
    plant.geneticType === 'autoflower'
      ? addDays(plant.startDate, 35)
      : plant.floraStartDate

  if (floraBase && date >= floraBase) {
    for (const semana of table.floraWeeks) {
      const inicio = addDays(floraBase, semana.dayStart)
      const fin = addDays(floraBase, semana.dayEnd)
      if (date >= inicio && date < fin) {
        return {
          ecMin: semana.ecMin,
          ecMax: semana.ecMax,
          phMin: semana.phMin,
          phMax: semana.phMax,
        }
      }
    }
  }

  // Evaluar semanas vegetativas
  for (const semana of table.vegeWeeks) {
    const inicio = addDays(plant.startDate, semana.dayStart)
    const fin = addDays(plant.startDate, semana.dayEnd)
    if (date >= inicio && date < fin) {
      return {
        ecMin: semana.ecMin,
        ecMax: semana.ecMax,
        phMin: semana.phMin,
        phMax: semana.phMax,
      }
    }
  }

  return null
}

/**
 * Retorna true si la planta es feminizada o regular, no tiene floraStartDate
 * registrada, y ya pasaron las 6 semanas del ciclo vegetativo (42 días).
 * Indica que el usuario debería registrar el inicio de floración manualmente.
 */
export function awaitingFloraStart(plant: Plant): boolean {
  if (plant.geneticType === 'autoflower') return false
  if (plant.floraStartDate) return false
  if (plant.status === 'harvested' || plant.status === 'discarded') return false

  const diasDesdeInicio = diasEntre(plant.startDate, new Date())
  return diasDesdeInicio >= 42 // 6 semanas × 7 días
}

/**
 * Devuelve el porcentaje de avance en el ciclo actual (0–1).
 * Vege: días desde inicio / 42 (6 semanas). Flora: días desde floraStart / 56 (8 semanas).
 * Retorna null si no hay información suficiente.
 */
export function getCycleProgress(
  plant: Plant,
  date: Date,
): { progress: number; phase: CyclePhase } | null {
  if (plant.status !== 'active') return null

  const floraBase =
    plant.floraStartDate ??
    (plant.geneticType === 'autoflower' ? addDays(plant.startDate, 35) : null)

  if (floraBase && date >= floraBase) {
    const days = differenceInDays(date, floraBase)
    return { progress: Math.min(days / 56, 1), phase: 'flora' }
  }

  const days = differenceInDays(date, plant.startDate)
  const maxDays = plant.geneticType === 'autoflower' ? 35 : 42
  return { progress: Math.min(days / maxDays, 0.97), phase: 'vege' }
}

/**
 * Escala una dosis de ml/L o gr/L a la cantidad total para X litros.
 * totalAmount representa la dosis máxima escalada al volumen indicado.
 */
export function scaleDose(
  dose: ProductDose,
  liters: number,
): { name: string; totalAmount: number; unit: string } {
  return {
    name: dose.name,
    totalAmount: dose.maxDose * liters,
    unit: dose.unit,
  }
}

/**
 * Verifica si el usuario tiene acceso a una tabla nutricional según su plan.
 * Las tablas 'free' son accesibles por todos; las 'pro' requieren plan pro.
 */
export function canAccessTable(
  table: NutritionTable,
  userPlan: AccessTier,
): boolean {
  if (table.accessTier === 'free') return true
  return userPlan === 'pro'
}
