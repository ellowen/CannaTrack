import type { Plant, ScheduledTask } from '../types/plant'

/**
 * Combina el calendario ya guardado de una planta con uno recien generado.
 *
 * Las tareas completadas son historial (y guardan xp_awarded): nunca se borran
 * ni se regeneran, asi no se puede volver a ganar XP por la misma tarea. Por cada
 * completada se descarta UNA tarea nueva equivalente (mismo ciclo, semana y tipo),
 * de a una: una semana tiene 2 riegos y completar uno no debe borrar el otro.
 */
export function mergeRegeneratedSchedule(
  existing: ScheduledTask[],
  generated: ScheduledTask[],
): { completed: ScheduledTask[]; pending: ScheduledTask[]; all: ScheduledTask[] } {
  // Historial que no se regenera: completadas, canceladas y reprogramadas (si no, una
  // tarea cancelada o movida reaparecia sola en su fecha original al editar la planta)
  const completed = existing.filter((t) => t.completed || t.skipped || t.rescheduledFrom)
  const pending = [...generated].sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime())

  for (const done of completed) {
    const i = pending.findIndex((c) => c.cycle === done.cycle && c.week === done.week && c.type === done.type)
    if (i >= 0) pending.splice(i, 1)
  }

  const all = [...completed, ...pending].sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime())
  return { completed, pending, all }
}

/** Campos de la planta que cambian el calendario. Nombre, notas, macetas, etc. no. */
const SCHEDULE_FIELDS: (keyof Plant)[] = [
  'geneticType', 'sex', 'startDate', 'floraStartDate', 'nutritionTableId',
  'autoFlowerTotalDays', 'floraDays', 'autoFloraStartDay', 'vegeDays', 'irrigationPerWeek',
  'availableProducts', 'customProducts',
]

const same = (a: unknown, b: unknown): boolean =>
  a instanceof Date || b instanceof Date
    ? (a instanceof Date ? a.getTime() : a) === (b instanceof Date ? b.getTime() : b)
    : JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

/** true si la edicion cambia algun dato del que depende el calendario. */
export function scheduleAffectingChange(before: Plant, after: Plant): boolean {
  return SCHEDULE_FIELDS.some((k) => !same(before[k], after[k]))
}
