import { describe, it, expect } from 'vitest'
import { compareToSheet, harvestStats, isValidHarvestWeight, sheetYieldFor } from '../harvest-stats'

const planta = {
  harvestWeightG: 60,
  startDate: new Date(2026, 0, 1),
  endDate: new Date(2026, 2, 17), // 75 dias
  potCount: 1,
  potVolumeLiters: 20,
}

describe('harvest-stats', () => {
  it('peso valido: positivo y hasta 10 kg', () => {
    expect([0, -5, NaN, 10001].some(isValidHarvestWeight)).toBe(false)
    expect([0.5, 45, 10000].every(isValidHarvestWeight)).toBe(true)
  })

  it('g por dia de cultivo y por litro de maceta', () => {
    const s = harvestStats(planta)!
    expect(s.gramsPerDay).toBeCloseTo(60 / 75)
    expect(s.gramsPerLiter).toBeCloseTo(3)
  })

  it('con varias macetas los litros se suman; sin cierre o sin litros no hay metrica', () => {
    expect(harvestStats({ ...planta, potCount: 2 })!.gramsPerLiter).toBeCloseTo(1.5)
    expect(harvestStats({ ...planta, endDate: undefined })!.gramsPerDay).toBeNull()
    expect(harvestStats({ ...planta, potVolumeLiters: undefined })!.gramsPerLiter).toBeNull()
    expect(harvestStats({ ...planta, harvestWeightG: undefined })).toBeNull()
  })

  it('compara contra el rango de la ficha (los bordes cuentan como dentro)', () => {
    const r = { min: 20, max: 75 }
    expect([10, 20, 50, 75, 90].map((g) => compareToSheet(g, r))).toEqual(['below', 'within', 'within', 'within', 'above'])
  })

  it('la ficha por planta solo existe para Strawberry Soda (las demas dan g por m2)', () => {
    expect(sheetYieldFor({ genetics: 'Strawberry Cough x Blue Auto Mazar' })).toEqual({ min: 20, max: 75 })
    expect(sheetYieldFor({ genetics: 'Magnum x Flat White S1' })).toBeNull()
    expect(sheetYieldFor({ genetics: 'otra' })).toBeNull()
  })
})
