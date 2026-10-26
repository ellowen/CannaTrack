import { describe, it, expect } from 'vitest'
import { reviveDates } from '../syncQueue'

describe('reviveDates (payloads de la cola persistida como JSON)', () => {
  it('convierte a Date los campos de fecha de una planta y sus tareas', () => {
    const plant = { id: 'p', name: 'x', startDate: new Date(2026, 9, 26), floraStartDate: new Date(2026, 10, 1) }
    const task = { id: 't', scheduledDate: new Date(2026, 9, 27), completedAt: undefined }
    const roundTrip = JSON.parse(JSON.stringify({ plant, tasks: [task] }))
    expect(typeof roundTrip.plant.startDate).toBe('string')

    const revived = reviveDates(roundTrip) as { plant: typeof plant; tasks: (typeof task)[] }
    expect(revived.plant.startDate).toBeInstanceOf(Date)
    expect(revived.plant.floraStartDate).toBeInstanceOf(Date)
    expect(revived.tasks[0].scheduledDate).toBeInstanceOf(Date)
    expect(revived.plant.startDate.getTime()).toBe(plant.startDate.getTime())
    expect(revived.plant.startDate.getDate()).toBe(26) // mismo dia local
  })

  it('no toca strings de otros campos ni Date ya validos', () => {
    const d = new Date()
    const out = reviveDates({ name: '2026-10-26T00:00:00.000Z', startDate: d, nested: { notes: 'hola' } })
    expect(out.name).toBe('2026-10-26T00:00:00.000Z')
    expect(out.startDate).toBe(d)
    expect(out.nested.notes).toBe('hola')
  })

  it('maneja null, undefined y primitivos', () => {
    expect(reviveDates(null)).toBeNull()
    expect(reviveDates(undefined)).toBeUndefined()
    expect(reviveDates(5)).toBe(5)
  })
})
