import { startOfDay } from 'date-fns'
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

const keyOf = (t: ScheduledTask) => `${t.cycle}|${t.week}|${t.type}`

/**
 * Descarta, de un calendario recien generado, las tareas que caen ANTES de hoy y que no existian
 * ya como pendientes. Son los dias que un cambio de fechas mete en el pasado (la floracion
 * arranco antes, el vegetativo se estiro, la siembra era anterior): se dan por cubiertos y no
 * aparecen como vencidos. Las pendientes que la planta YA tenia vencidas se conservan (siguen
 * vencidas hasta que se resuelvan); se descuentan de a una por (ciclo, semana, tipo), igual que el merge.
 * Lo de hoy en adelante siempre se conserva.
 */
export function coverRetroactiveTasks(
  existing: ScheduledTask[],
  generated: ScheduledTask[],
  today: Date,
): ScheduledTask[] {
  const start = startOfDay(today).getTime()
  const budget = new Map<string, number>()
  for (const t of existing) {
    if (t.completed || t.skipped || t.rescheduledFrom) continue
    // solo las que YA estaban vencidas: una pendiente a futuro que el corrimiento de fechas manda al
    // pasado tambien cuenta como cubierta
    if (t.scheduledDate.getTime() >= start) continue
    budget.set(keyOf(t), (budget.get(keyOf(t)) ?? 0) + 1)
  }
  return generated.filter((g) => {
    if (g.scheduledDate.getTime() >= start) return true
    const left = budget.get(keyOf(g)) ?? 0
    if (left <= 0) return false
    budget.set(keyOf(g), left - 1)
    return true
  })
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
