import { describe, it, expect } from 'vitest'
import { addDays } from 'date-fns'
import { mergeRegeneratedSchedule, scheduleAffectingChange } from '../schedule-merge'
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
