import { describe, it, expect } from 'vitest'
import { addDays } from 'date-fns'
import { coverRetroactiveTasks, mergeRegeneratedSchedule, scheduleAffectingChange } from '../schedule-merge'
import { generatePlantSchedule } from '../nutrition-engine'
import { REVEGETAR_TABLE } from '../../data/revegetar-table'
import type { Plant, ScheduledTask } from '../../types/plant'

const inicio = new Date(2026, 0, 1)
const planta = (o: Partial<Plant> = {}): Plant => ({
  id: 'p', name: 'x', genetics: 'g', geneticType: 'autoflower', sex: 'unknown', startDate: inicio,
  autoFlowerTotalDays: 75, location: 'outdoor', potCount: 1, potVolumeLiters: 20,
  nutritionTableId: REVEGETAR_TABLE.id, status: 'active', ...o,
})

describe('mergeRegeneratedSchedule', () => {
  const base = generatePlantSchedule(planta(), REVEGETAR_TABLE)

  it('conserva las completadas con su id y xp_awarded', () => {
    const riego = base.find((t) => t.type === 'irrigation')!
    const hecha: ScheduledTask = { ...riego, completed: true, xpAwarded: true }
    const { all, completed } = mergeRegeneratedSchedule([hecha], generatePlantSchedule(planta(), REVEGETAR_TABLE))
    expect(completed).toEqual([hecha])
    expect(all.find((t) => t.id === hecha.id)?.xpAwarded).toBe(true)
  })

  it('no duplica: por cada completada se descarta UNA tarea equivalente nueva', () => {
    const riego = base.find((t) => t.type === 'irrigation')!
    const { all } = mergeRegeneratedSchedule([{ ...riego, completed: true }], generatePlantSchedule(planta(), REVEGETAR_TABLE))
    expect(all.length).toBe(base.length)
  })

  it('completar un riego no borra el otro riego de la misma semana', () => {
    const riegosSemana0 = base.filter((t) => t.type === 'irrigation' && t.cycle === 'vege' && t.week === 0)
    expect(riegosSemana0.length).toBe(2)
    const { pending } = mergeRegeneratedSchedule([{ ...riegosSemana0[0], completed: true }], generatePlantSchedule(planta(), REVEGETAR_TABLE))
    expect(pending.filter((t) => t.type === 'irrigation' && t.cycle === 'vege' && t.week === 0)).toHaveLength(1)
  })

  it('sin completadas devuelve el calendario nuevo entero', () => {
    const nuevo = generatePlantSchedule(planta(), REVEGETAR_TABLE)
    const { all, completed } = mergeRegeneratedSchedule([], nuevo)
    expect(completed).toHaveLength(0)
    expect(all).toHaveLength(nuevo.length)
  })
})

describe('scheduleAffectingChange', () => {
  const a = planta()
  it('nombre, notas, macetas y ubicacion NO regeneran', () => {
    expect(scheduleAffectingChange(a, { ...a, name: 'otro', notes: 'n', potCount: 3, potVolumeLiters: 40, location: 'indoor' })).toBe(false)
  })
  it('fecha de inicio, ciclo, tipo, tabla y productos SI regeneran', () => {
    expect(scheduleAffectingChange(a, { ...a, startDate: addDays(inicio, 5) })).toBe(true)
    expect(scheduleAffectingChange(a, { ...a, floraDays: 45 })).toBe(true)
    expect(scheduleAffectingChange(a, { ...a, autoFlowerTotalDays: 84 })).toBe(true)
    expect(scheduleAffectingChange(a, { ...a, geneticType: 'feminized' })).toBe(true)
    expect(scheduleAffectingChange(a, { ...a, nutritionTableId: 'topcrop-v1' })).toBe(true)
    expect(scheduleAffectingChange(a, { ...a, availableProducts: ['Rootproof'] })).toBe(true)
  })
  it('la misma fecha como otro objeto Date no cuenta como cambio', () => {
    expect(scheduleAffectingChange(a, { ...a, startDate: new Date(inicio.getTime()) })).toBe(false)
  })
})

describe('coverRetroactiveTasks', () => {
  const hoy = new Date(2026, 5, 10)
  const tarea = (cycle: 'vege' | 'flora', week: number, type: ScheduledTask['type'], dias: number, extra: Partial<ScheduledTask> = {}): ScheduledTask => ({
    id: `${cycle}${week}${type}${dias}`, plantId: 'p', userId: 'u', type, scheduledDate: addDays(hoy, dias), cycle, week, stage: 'stretch',
    products: [], completed: false, ...extra,
  } as ScheduledTask)

  it('lo de hoy en adelante siempre se conserva', () => {
    const nuevas = [tarea('flora', 1, 'nutrition', 0), tarea('flora', 2, 'nutrition', 7)]
    expect(coverRetroactiveTasks([], nuevas, hoy)).toHaveLength(2)
  })

  it('una tarea pasada que no existia antes se da por cubierta (no se agrega)', () => {
    const nuevas = [tarea('flora', 1, 'nutrition', -10), tarea('flora', 2, 'nutrition', 4)]
    expect(coverRetroactiveTasks([], nuevas, hoy).map((t) => t.week)).toEqual([2])
  })

  it('una pendiente vieja se conserva (sigue vencida), de a una por ciclo, semana y tipo', () => {
    const existentes = [tarea('vege', 3, 'irrigation', -3)]
    const nuevas = [tarea('vege', 3, 'irrigation', -3), tarea('vege', 3, 'irrigation', -1), tarea('vege', 4, 'irrigation', -20)]
    const r = coverRetroactiveTasks(existentes, nuevas, hoy)
    expect(r.filter((t) => t.week === 3)).toHaveLength(1) // el segundo riego de esa semana no existia: cubierto
    expect(r.filter((t) => t.week === 4)).toHaveLength(0)
  })

  it('una pendiente a futuro que el corrimiento de fechas manda al pasado tambien queda cubierta', () => {
    const existentes = [tarea('flora', 4, 'nutrition', 3)] // estaba a futuro
    const nuevas = [tarea('flora', 4, 'nutrition', -7)] // ahora cae 7 dias atras
    expect(coverRetroactiveTasks(existentes, nuevas, hoy)).toHaveLength(0)
  })

  it('las completadas, canceladas y movidas no cuentan como pendientes que conservar', () => {
    const existentes = [
      tarea('vege', 1, 'nutrition', -5, { completed: true }),
      tarea('vege', 2, 'nutrition', -5, { skipped: true }),
      tarea('vege', 3, 'nutrition', -5, { rescheduledFrom: addDays(hoy, -8) }),
    ]
    const nuevas = [tarea('vege', 1, 'nutrition', -5), tarea('vege', 2, 'nutrition', -5), tarea('vege', 3, 'nutrition', -5)]
    expect(coverRetroactiveTasks(existentes, nuevas, hoy)).toHaveLength(0)
  })
})
