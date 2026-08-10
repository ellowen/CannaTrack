import { describe, it, expect } from 'vitest'
import { isValidPlant, isCannabisPlant } from '../plant'

// Fase 3 -- desbloqueo multi-cultivo del modelo de datos. Estos tests
// cubren la regla de negocio que espeja la migracion de Supabase
// (plants_cannabis_requires_genetic_type): cannabis requiere geneticType,
// cualquier otro cropType no.

describe('isValidPlant', () => {
  // TEST 1 -- planta existente feminized
  it('cannabis feminized con geneticType: valida', () => {
    expect(isValidPlant({ cropType: 'cannabis', geneticType: 'feminized' })).toBe(true)
  })

  // TEST 2 -- autoflower
  it('cannabis autoflower con geneticType: valida', () => {
    expect(isValidPlant({ cropType: 'cannabis', geneticType: 'autoflower' })).toBe(true)
  })

  // TEST 3 / 4 -- regular (female/male) -- isValidPlant solo verifica que
  // exista geneticType, no el valor de sex (esa regla vive en el motor)
  it('cannabis regular con geneticType: valida', () => {
    expect(isValidPlant({ cropType: 'cannabis', geneticType: 'regular' })).toBe(true)
  })

  // cropType ausente == 'cannabis' (compatibilidad con plantas existentes,
  // creadas antes de que cropType existiera como campo)
  it('cropType ausente se trata como cannabis -- requiere geneticType', () => {
    expect(isValidPlant({ geneticType: 'feminized' })).toBe(true)
    expect(isValidPlant({})).toBe(false)
  })

  // Caso negativo -- exactamente lo que el CHECK de la migracion rechaza
  it('cannabis SIN geneticType: invalida', () => {
    expect(isValidPlant({ cropType: 'cannabis', geneticType: undefined })).toBe(false)
  })

  // TEST 5 -- planta generica sin geneticType
  it('cropType tomato sin geneticType: valida', () => {
    expect(isValidPlant({ cropType: 'tomato', geneticType: undefined })).toBe(true)
  })

  // TEST 6 -- cropType arbitrario
  it('cropType basil sin geneticType: valida', () => {
    expect(isValidPlant({ cropType: 'basil', geneticType: undefined })).toBe(true)
  })

  // Un cultivo no-cannabis con geneticType igual seteado (no deberia pasar
  // en la practica, pero el tipo lo permite) no debe romper la validacion
  it('cropType no-cannabis con geneticType igual presente: valida', () => {
    expect(isValidPlant({ cropType: 'tomato', geneticType: 'feminized' })).toBe(true)
  })
})

// Fase 4 -- isCannabisPlant es el guard que usan nutrition-utils.ts, Home.tsx
// y PlantDetail.tsx para no mostrar/calcular nada especifico de cannabis en
// plantas de otros cultivos.
describe('isCannabisPlant', () => {
  it('cropType ausente (planta existente antes de Fase 4): cannabis', () => {
    expect(isCannabisPlant({})).toBe(true)
  })

  it("cropType: 'cannabis' explicito: cannabis", () => {
    expect(isCannabisPlant({ cropType: 'cannabis' })).toBe(true)
  })

  it("cropType: 'tomato'/'basil'/otro: no cannabis", () => {
    expect(isCannabisPlant({ cropType: 'tomato' })).toBe(false)
    expect(isCannabisPlant({ cropType: 'basil' })).toBe(false)
    expect(isCannabisPlant({ cropType: 'other' })).toBe(false)
  })
})
