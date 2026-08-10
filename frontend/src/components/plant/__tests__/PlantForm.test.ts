import { describe, it, expect } from 'vitest'
import { normalizeFormValuesForSubmit } from '../PlantForm.utils'
import type { PlantFormValues } from '../PlantForm.utils'

function baseValues(overrides: Partial<PlantFormValues> = {}): PlantFormValues {
  return {
    name: 'Test Plant',
    cropType: 'cannabis',
    genetics: 'White Widow',
    geneticType: 'feminized',
    sex: 'unknown',
    startDate: '2026-01-01',
    location: 'indoor',
    growMedium: 'soil',
    potCount: 1,
    potVolumeLiters: 11,
    nutritionTableId: 'revegetar',
    autoFlowerTotalDays: 75,
    availableProducts: undefined,
    customProducts: [],
    notes: '',
    ...overrides,
  }
}

describe('normalizeFormValuesForSubmit', () => {
  it('conserva geneticType para cannabis', () => {
    const result = normalizeFormValuesForSubmit(baseValues({ cropType: 'cannabis', geneticType: 'feminized' }))
    expect(result.geneticType).toBe('feminized')
  })

  it('conserva sex para cannabis', () => {
    const result = normalizeFormValuesForSubmit(baseValues({ cropType: 'cannabis', geneticType: 'regular', sex: 'female' }))
    expect(result.sex).toBe('female')
  })

  it('limpia geneticType para no-cannabis (no persiste el default heredado)', () => {
    const result = normalizeFormValuesForSubmit(baseValues({ cropType: 'tomato', geneticType: 'feminized' }))
    expect(result.geneticType).toBeUndefined()
  })

  it('limpia sex para no-cannabis (no persiste el default heredado)', () => {
    const result = normalizeFormValuesForSubmit(baseValues({ cropType: 'tomato', sex: 'unknown' }))
    expect(result.sex).toBeUndefined()
  })

  it('cannabis -> no-cannabis: no deja residuos de geneticType/sex', () => {
    const wasEditingCannabis = baseValues({ cropType: 'cannabis', geneticType: 'feminized', sex: 'female' })
    const result = normalizeFormValuesForSubmit({ ...wasEditingCannabis, cropType: 'tomato' })
    expect(result.geneticType).toBeUndefined()
    expect(result.sex).toBeUndefined()
  })

  it('no-cannabis -> cannabis: vuelve a enviar geneticType/sex concretos', () => {
    const wasEditingTomato = baseValues({ cropType: 'tomato', geneticType: 'feminized', sex: 'unknown' })
    const result = normalizeFormValuesForSubmit({ ...wasEditingTomato, cropType: 'cannabis' })
    expect(result.geneticType).toBe('feminized')
    expect(result.sex).toBe('unknown')
  })

  it('no-cannabis -> cannabis sin tocar el toggle: geneticType/sex quedan undefined en el estado pero igual se envian concretos (regresion: violaba el CHECK plants_cannabis_requires_genetic_type)', () => {
    const wasEditingTomato = baseValues({ cropType: 'tomato', geneticType: undefined, sex: undefined })
    const result = normalizeFormValuesForSubmit({ ...wasEditingTomato, cropType: 'cannabis' })
    expect(result.geneticType).toBe('feminized')
    expect(result.sex).toBe('unknown')
  })

  it('no modifica el resto de los campos', () => {
    const values = baseValues({ cropType: 'basil', name: 'Albahaca 1', potCount: 3 })
    const result = normalizeFormValuesForSubmit(values)
    expect(result.name).toBe('Albahaca 1')
    expect(result.potCount).toBe(3)
    expect(result.cropType).toBe('basil')
  })
})
