import { addDays } from 'date-fns'
import type {
  Plant,
  NutritionTable,
  NutritionWeek,
  ScheduledTask,
  CyclePhase,
} from '../types/plant'

// ─── Generadores de ID ───────────────────────────────────────────────────────

let _idCounter = 0
function nextId(): string {
  return `task-${++_idCounter}-${Math.random().toString(36).slice(2, 6)}`
}

// ─── Constructores de tareas ─────────────────────────────────────────────────

function crearTareaNutricion(
  plant: Plant,
  week: NutritionWeek,
  fecha: Date,
  ciclo: CyclePhase,
): ScheduledTask {
  return {
    id: nextId(),
    plantId: plant.id,
    type: 'nutrition',
    scheduledDate: fecha,
    cycle: ciclo,
    week: week.week,
    stage: week.stage,
    products: week.products,
    ecMin: week.ecMin,
    ecMax: week.ecMax,
    phMin: week.phMin,
    phMax: week.phMax,
    completed: false,
  }
}

function crearTareaObservacion(
  plant: Plant,
  week: NutritionWeek,
  fecha: Date,
  ciclo: CyclePhase,
): ScheduledTask {
  return {
    id: nextId(),
    plantId: plant.id,
    type: 'observation',
    scheduledDate: fecha,
    cycle: ciclo,
    week: week.week,
    stage: week.stage,
    products: [],
    completed: false,
  }
}

function crearTareaRiego(
  plant: Plant,
  week: NutritionWeek,
  fecha: Date,
  ciclo: CyclePhase,
): ScheduledTask {
  return {
    id: nextId(),
    plantId: plant.id,
    type: 'irrigation',
    scheduledDate: fecha,
    cycle: ciclo,
    week: week.week,
    stage: week.stage,
    products: [],
    phMin: week.phMin,
    phMax: week.phMax,
    completed: false,
  }
}

function crearTareaCosecha(
  plant: Plant,
  week: NutritionWeek,
  fecha: Date,
  ciclo: CyclePhase,
): ScheduledTask {
  return {
    id: nextId(),
    plantId: plant.id,
    type: 'harvest',
    scheduledDate: fecha,
    cycle: ciclo,
    week: week.week,
    stage: 'harvested',
    products: [],
    completed: false,
  }
}

// ─── Generación de tareas por semana ─────────────────────────────────────────

/**
 * Genera las tareas de una semana del cronograma.
 * - Semanas normales: nutrición + observación (día 0) + 2 riegos (días 2 y 4)
 * - Semanas de limpieza (flushing): solo riego (días 0, 2 y 4)
 */
function generarTareasSemana(
  plant: Plant,
  week: NutritionWeek,
  inicioSemana: Date,
  ciclo: CyclePhase,
): ScheduledTask[] {
  const tareas: ScheduledTask[] = []
  const esFlushing = week.stage === 'flushing'

  if (esFlushing) {
    // Semanas F7/F8: solo agua — tres riegos simples
    tareas.push(crearTareaRiego(plant, week, inicioSemana, ciclo))
    tareas.push(crearTareaRiego(plant, week, addDays(inicioSemana, 2), ciclo))
    tareas.push(crearTareaRiego(plant, week, addDays(inicioSemana, 4), ciclo))
  } else {
    // Semana normal: nutrición + observación el día 0, riegos en días 2 y 4
    tareas.push(crearTareaNutricion(plant, week, inicioSemana, ciclo))
    tareas.push(crearTareaObservacion(plant, week, inicioSemana, ciclo))
    tareas.push(crearTareaRiego(plant, week, addDays(inicioSemana, 2), ciclo))
    tareas.push(crearTareaRiego(plant, week, addDays(inicioSemana, 4), ciclo))
  }

  return tareas
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Genera el cronograma completo de tareas de una planta.
 * Agnóstico a la marca — recibe cualquier NutritionTable como parámetro.
 *
 * Lógica por tipo de genética:
 * - feminized/regular: genera VEGE; agrega FLORA si existe floraStartDate
 * - regular + sex === 'male': devuelve []
 * - autoflower: genera VEGE + FLORA completo (floraStartDate = startDate + 35 días)
 */
export function generatePlantSchedule(
  plant: Plant,
  table: NutritionTable,
): ScheduledTask[] {
  // Planta regular macho → sin cronograma
  if (plant.geneticType === 'regular' && plant.sex === 'male') {
    return []
  }

  const tareas: ScheduledTask[] = []
  const inicioVege = plant.startDate

  // Calcular inicio de floración según genética
  let inicioFlora: Date | undefined
  if (plant.geneticType === 'autoflower') {
    // Autofloreciente: floración automática a los 35 días
    inicioFlora = addDays(inicioVege, 35)
  } else {
    // Feminizada/regular: floración manual registrada por el usuario
    inicioFlora = plant.floraStartDate
  }

  // Generar tareas del ciclo vegetativo
  for (const semana of table.vegeWeeks) {
    const inicioSemana = addDays(inicioVege, semana.dayStart)
    tareas.push(...generarTareasSemana(plant, semana, inicioSemana, 'vege'))
  }

  // Generar tareas del ciclo de floración (si corresponde)
  if (inicioFlora !== undefined) {
    const floraBase = inicioFlora

    for (const semana of table.floraWeeks) {
      const inicioSemana = addDays(floraBase, semana.dayStart)
      tareas.push(...generarTareasSemana(plant, semana, inicioSemana, 'flora'))
    }

    // Tarea de cosecha al final del ciclo
    const ultimaSemana = table.floraWeeks[table.floraWeeks.length - 1]
    const fechaCosecha =
      plant.geneticType === 'autoflower'
        ? addDays(inicioVege, plant.autoFlowerTotalDays ?? 75)
        : addDays(floraBase, ultimaSemana.dayEnd)

    tareas.push(crearTareaCosecha(plant, ultimaSemana, fechaCosecha, 'flora'))
  }

  // Ordenar por fecha
  return tareas.sort(
    (a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime(),
  )
}

/**
 * Regenera el cronograma al registrar el inicio de floración (feminizada/regular).
 * Devuelve el cronograma completo con VEGE + FLORA a partir de la fecha dada.
 */
export function startFloraPhase(
  plant: Plant,
  floraStartDate: Date,
  table: NutritionTable,
): ScheduledTask[] {
  const plantaActualizada: Plant = { ...plant, floraStartDate }
  return generatePlantSchedule(plantaActualizada, table)
}
